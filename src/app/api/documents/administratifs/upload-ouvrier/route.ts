import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { readPortalSessionFromCookie } from '@/app/public/portail/auth'

export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    // Vérifier la session portail (code PIN)
    const cookieHeader = request.headers.get('cookie')
    console.log('🔍 Cookie header reçu:', cookieHeader ? 'présent' : 'absent')
    const portalSession = readPortalSessionFromCookie(cookieHeader)
    console.log('🔐 Session portail extraite:', portalSession)

    if (!portalSession || portalSession.t !== 'OUVRIER_INTERNE') {
      console.error('❌ Accès non autorisé - Session:', portalSession)
      return localizedJson({ 
        error: 'Accès non autorisé. Seuls les ouvriers internes connectés via code PIN peuvent uploader des documents.' 
      }, { status: 401 })
    }

    // Vérifier que l'ouvrier interne existe et est actif
    const ouvrierInterne = await prisma.ouvrierInterne.findUnique({
      where: {
        id: portalSession.id
      }
    })

    if (!ouvrierInterne || !ouvrierInterne.actif) {
      return localizedJson({ 
        error: 'Ouvrier interne non trouvé ou inactif.' 
      }, { status: 403 })
    }

    // Vérifier que le PIN est toujours actif
    const access = await prisma.publicAccessPIN.findFirst({
      where: {
        subjectType: 'OUVRIER_INTERNE',
        subjectId: portalSession.id,
        estActif: true,
      }
    })

    if (!access) {
      return localizedJson({ 
        error: 'Session invalide. Veuillez vous reconnecter.' 
      }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const nomDocument = formData.get('nom') as string | null

    console.log('📄 Fichier reçu:', file ? { name: file.name, size: file.size, type: file.type } : 'aucun')
    console.log('📝 Nom document:', nomDocument || 'non fourni')

    if (!file) {
      console.error('❌ Aucun fichier fourni dans le FormData')
      return localizedJson({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const documentsBaseDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
    const adminDocsDir = path.join(documentsBaseDir, 'administratifs')

    console.log('📁 Répertoires:', { documentsBaseDir, adminDocsDir })

    if (!existsSync(documentsBaseDir)) {
      console.log('📁 Création du répertoire documents')
      await mkdir(documentsBaseDir, { recursive: true })
    }
    if (!existsSync(adminDocsDir)) {
      console.log('📁 Création du répertoire administratifs')
      await mkdir(adminDocsDir, { recursive: true })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const uniqueFilename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`
    const filePath = path.join(adminDocsDir, uniqueFilename)
    const fileUrl = `/uploads/documents/administratifs/${uniqueFilename}`

    console.log('💾 Écriture du fichier:', { filePath, fileUrl, size: file.size })

    try {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)
      console.log('✅ Fichier écrit avec succès')
    } catch (writeError) {
      console.error('❌ Erreur lors de l\'écriture du fichier:', writeError)
      throw writeError
    }

    // Créer ou récupérer le tag "Comptabilité"
    console.log('🏷️ Création/récupération du tag Comptabilité')
    let tagComptabilite
    try {
      tagComptabilite = await prisma.tag.upsert({
        where: { nom: 'Comptabilité' },
        update: {},
        create: { nom: 'Comptabilité' },
        select: { id: true }
      })
      console.log('✅ Tag Comptabilité:', tagComptabilite.id)
    } catch (tagError) {
      console.error('❌ Erreur lors de la création/récupération du tag:', tagError)
      throw tagError
    }

    // Nom du document : utiliser celui fourni ou générer un nom automatique
    const documentNom = nomDocument?.trim() || `Document_${new Date().toISOString().split('T')[0]}_${timestamp}`

    // Utiliser le type MIME du fichier pour mimeType, et l'extension pour type
    const mimeType = file.type || 'application/octet-stream'
    const fileType = path.extname(file.name).slice(1) || 'inconnu'

    // Pour les ouvriers internes, on doit utiliser un User système car createdBy est obligatoire
    // On cherche un User ADMIN ou MANAGER pour associer le document
    console.log('👤 Recherche d\'un User système (ADMIN/MANAGER)')
    let systemUser
    try {
      systemUser = await prisma.user.findFirst({
        where: {
          role: {
            in: ['ADMIN', 'MANAGER']
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      if (!systemUser) {
        console.error('❌ Aucun User ADMIN ou MANAGER trouvé pour associer le document')
        return localizedJson({ 
          error: 'Erreur de configuration système. Veuillez contacter un administrateur.' 
        }, { status: 500 })
      }
      console.log('✅ User système trouvé:', systemUser.id)
    } catch (userError) {
      console.error('❌ Erreur lors de la recherche du User système:', userError)
      throw userError
    }

    // Créer le document avec le tag "Comptabilité"
    console.log('📝 Création du document dans la base de données')
    let newDocument
    try {
      newDocument = await prisma.document.create({
        data: {
          nom: documentNom,
          url: fileUrl,
          type: fileType,
          mimeType: mimeType,
          taille: file.size,
          User: { connect: { id: systemUser.id } },
          updatedAt: new Date(),
          tags: {
            connect: [{ id: tagComptabilite.id }]
          }
        },
        include: {
          User: true,
          tags: true
        }
      })
      console.log('✅ Document créé avec succès:', newDocument.id)
    } catch (docError) {
      console.error('❌ Erreur lors de la création du document:', docError)
      throw docError
    }

    const tagNamesFromDoc = newDocument.tags.map(tag => tag.nom)

    return localizedJson({ 
      message: 'Document uploadé avec succès',
      document: {
        id: newDocument.id.toString(),
        nom: newDocument.nom,
        url: newDocument.url,
        type: newDocument.type,
        taille: newDocument.taille,
        dateUpload: newDocument.createdAt.toISOString(),
        tags: tagNamesFromDoc,
        uploadedBy: ouvrierInterne ? `${ouvrierInterne.prenom || ''} ${ouvrierInterne.nom || ''}`.trim() || 'Ouvrier interne' : 'Ouvrier interne',
      }
    })
  } catch (error: unknown) {
    console.error('❌ Erreur lors de l\'upload du document par ouvrier interne:', error)
    if (error instanceof Error) {
      console.error('❌ Message d\'erreur:', error.message)
      console.error('❌ Stack trace:', error.stack)
    }
    return localizedJson({ 
      error: error instanceof Error ? `Erreur serveur: ${error.message}` : 'Erreur serveur lors de l\'upload du document' 
    }, { status: 500 })
  }
}

