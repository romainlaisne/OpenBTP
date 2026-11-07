import { bindRequestLocale } from '@/lib/i18n/server'
import { collectStrings, localizeGeneratedHtml } from '@/lib/i18n/translate'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateMetreHTML, type MetreData } from '@/lib/pdf/templates/metre-template'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; metreId: string }> }
) {
  await bindRequestLocale()
  try {
    const params = await props.params
    const { chantierId, metreId } = params

    console.log(`🎯 Génération PDF moderne - Métré ${metreId} du chantier ${chantierId}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer le métré avec toutes les données nécessaires
    const metre = await prisma.metreChantier.findFirst({
      where: {
        id: metreId,
        chantierId: chantierId,
      },
      include: {
        categories: {
          include: {
            lignes: {
              orderBy: { ordre: 'asc' },
            },
          },
          orderBy: { ordre: 'asc' },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!metre) {
      return localizedJson({ error: 'Métré non trouvé' }, { status: 404 })
    }

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierId },
      select: {
        chantierId: true,
        nomChantier: true,
        clientNom: true,
        adresseChantier: true,
      },
    })

    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer les informations de l'entreprise
    const companySettings = await prisma.companysettings.findFirst()
    if (!companySettings) {
      return localizedJson({ error: 'Paramètres entreprise non trouvés' }, { status: 500 })
    }

    // Récupérer le logo en base64
    let logoBase64 = ''
    if (companySettings.logo) {
      try {
        const logoPath = join(process.cwd(), 'public', companySettings.logo)
        const logoBuffer = await readFile(logoPath)
        logoBase64 = logoBuffer.toString('base64')
      } catch (error) {
        console.warn('Impossible de charger le logo:', error)
      }
    }

    // Préparer les données pour le template
    const metreData: MetreData = {
      metre: {
        id: metre.id,
        date: metre.date.toISOString(),
        commentaire: metre.commentaire,
        createdAt: metre.createdAt.toISOString(),
        categories: metre.categories.map((cat) => ({
          id: cat.id,
          nom: cat.nom,
          unite: cat.unite,
          lignes: cat.lignes.map((ligne) => ({
            id: ligne.id,
            description: ligne.description,
            unite: ligne.unite,
            longueur: ligne.longueur,
            largeur: ligne.largeur,
            hauteur: ligne.hauteur,
            quantite: ligne.quantite,
            notes: ligne.notes,
          })),
        })),
        createdByUser: {
          id: metre.createdByUser.id,
          name: metre.createdByUser.name,
          email: metre.createdByUser.email,
        },
      },
      chantier: {
        chantierId: chantier.chantierId,
        nomChantier: chantier.nomChantier,
        clientNom: chantier.clientNom,
        adresseChantier: chantier.adresseChantier,
      },
      companySettings: {
        nom: companySettings.name || 'Entreprise',
        adresse: companySettings.address || null,
        codePostal: companySettings.zipCode || null,
        ville: companySettings.city || null,
        telephone: companySettings.phone || null,
        email: companySettings.email || null,
        siret: companySettings.iban || null, // Utiliser iban comme siret si pas de champ siret
        tva: companySettings.tva || null,
        logo: companySettings.logo || undefined,
      },
      logoBase64,
    }

    // Générer le HTML
    const __locale = await bindRequestLocale()
    const htmlContent = localizeGeneratedHtml(__locale, generateMetreHTML(metreData), collectStrings(metreData))

    // Générer le PDF avec Puppeteer
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    })

    console.log('✅ PDF généré avec succès')

    // Formater la date pour le nom de fichier
    const dateStr = new Date(metre.date).toISOString().split('T')[0]

    // Convertir le Buffer en Uint8Array pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="metre-${chantier.chantierId}-${dateStr}.pdf"`,
      },
    })

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF de métré:', error)
    return localizedJson(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}

