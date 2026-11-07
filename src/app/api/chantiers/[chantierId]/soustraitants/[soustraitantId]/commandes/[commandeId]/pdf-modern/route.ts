import { bindRequestLocale } from '@/lib/i18n/server'
import { collectStrings, localizeGeneratedHtml } from '@/lib/i18n/translate'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateCommandeSoustraitantHTML, type CommandeSoustraitantData } from '@/lib/pdf/templates/commande-soustraitant-template'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  await bindRequestLocale()
  try {
    const resolvedParams = await props.params
    const chantierIdReadable = resolvedParams.chantierId
    const soustraitantId = resolvedParams.soustraitantId
    const commandeId = resolvedParams.commandeId

    console.log(`🎯 Génération PDF moderne - Commande sous-traitant N°${commandeId} du chantier ${chantierIdReadable}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'ID interne du chantier à partir de son ID lisible
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierIdReadable },
      select: { id: true, nomChantier: true, chantierId: true }
    })

    if (!chantier) {
      console.error(`❌ Chantier non trouvé: ${chantierIdReadable}`)
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer la commande sous-traitant avec toutes les données nécessaires
    const commande = await prisma.commandeSousTraitant.findFirst({
      where: {
        id: parseInt(commandeId),
        chantierId: chantier.id,
        soustraitantId: soustraitantId
      },
      include: {
        lignes: {
          orderBy: { ordre: 'asc' }
        },
        Chantier: {
          select: {
            id: true,
            chantierId: true,
            nomChantier: true,
            adresseChantier: true,
            clientNom: true,
            client: {
              select: {
                nom: true
              }
            }
          }
        },
        soustraitant: {
          select: {
            nom: true,
            email: true,
            contact: true,
            adresse: true,
            telephone: true,
            tva: true
          }
        }
      }
    })

    if (!commande) {
      console.error(`❌ Commande sous-traitant N°${commandeId} non trouvée`)
      return localizedJson({ error: 'Commande sous-traitant non trouvée' }, { status: 404 })
    }

    console.log(`✅ Commande trouvée: ${commande.reference || `CMD-${commande.id}`} pour ${commande.soustraitant.nom}`)

    // Récupérer les paramètres de l'entreprise
    const companySettings = await PDFGenerator.getCompanySettings()
    console.log(`📋 Paramètres entreprise: ${companySettings?.nomEntreprise || 'Non définie'}`)

    // Préparer les données pour le template
    const commandeData: CommandeSoustraitantData = {
      reference: commande.reference || `CMD-ST-${commande.id}`,
      dateCommande: commande.dateCommande,
      estVerrouillee: commande.estVerrouillee,
      chantier: {
        nomChantier: commande.Chantier.nomChantier,
        adresseChantier: commande.Chantier.adresseChantier || '',
        chantierId: commande.Chantier.chantierId
      },
      soustraitant: {
        nom: commande.soustraitant.nom || 'Sous-traitant non spécifié',
        contact: commande.soustraitant.contact || undefined,
        email: commande.soustraitant.email || undefined,
        adresse: commande.soustraitant.adresse || undefined,
        telephone: commande.soustraitant.telephone || undefined,
        tva: commande.soustraitant.tva || undefined
      },
      lignes: commande.lignes.map(ligne => ({
        id: ligne.id,
        ordre: ligne.ordre,
        article: ligne.article,
        description: ligne.description,
        type: ligne.type,
        unite: ligne.unite,
        prixUnitaire: ligne.prixUnitaire,
        quantite: ligne.quantite,
        total: ligne.total
      })),
      sousTotal: commande.sousTotal,
      tauxTVA: commande.tauxTVA,
      tva: commande.tva,
      totalTTC: commande.total
    }

    console.log('🎨 Génération du HTML...')
    // Générer le HTML avec le template spécifique sous-traitant
    const __locale = await bindRequestLocale()
    const htmlContent = localizeGeneratedHtml(__locale, generateCommandeSoustraitantHTML(commandeData, companySettings, companySettings?.logo), collectStrings(commandeData))

    // Générer le PDF avec Puppeteer en format portrait
    console.log('📄 Génération du PDF avec Puppeteer (portrait)...')
    const pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      }
    })

    console.log(`✅ PDF généré: ${pdfBuffer.length} bytes`)

    // Nom du fichier
    const fileName = `commande-soustraitant-${commande.Chantier.chantierId}-${commande.soustraitant.nom.replace(/[^a-zA-Z0-9]/g, '_')}-${commande.reference || commande.id}.pdf`

    // Retourner le PDF avec headers pour permettre l'affichage dans iframe
    // Convertir le Buffer en Uint8Array pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)
    const response = new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        // Headers pour permettre l'affichage dans iframe
        'Content-Security-Policy': "frame-ancestors 'self'",
      }
    })
    
    // Supprimer explicitement X-Frame-Options si défini par next.config.js
    response.headers.delete('X-Frame-Options')
    
    return response

  } catch (error) {
    console.error('❌ Erreur génération PDF commande sous-traitant:', error)
    return localizedJson(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}

