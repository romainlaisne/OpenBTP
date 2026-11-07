import { bindRequestLocale } from '@/lib/i18n/server'
import { collectStrings, localizeGeneratedHtml } from '@/lib/i18n/translate'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateReceptionHTML, type ReceptionData } from '@/lib/pdf/templates/reception-template'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; id: string }> }
) {
  await bindRequestLocale()
  try {
    const params = await props.params
    const { chantierId, id } = params

    console.log(`🎯 Génération PDF moderne - Réception ${id} pour chantier ${chantierId}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer la réception avec toutes les données nécessaires
    const reception = await prisma.reception.findUnique({
      where: { id: parseInt(id) },
      include: {
        chantier: {
          include: {
            client: {
              select: {
                nom: true
              }
            }
          }
        },
        remarques: {
          orderBy: { id: 'asc' }
        }
      }
    })

    if (!reception) {
      return localizedJson({ error: 'Réception non trouvée' }, { status: 404 })
    }

    // Récupérer les informations de l'entreprise
    const settings = await prisma.settings.findFirst()
    const companySettings = {
      name: settings?.name || 'Entreprise',
      address: settings?.address || 'Adresse non définie',
      zipCode: settings?.zipCode || '00000',
      city: settings?.city || 'Ville',
      phone: settings?.phone || '00 00 00 00 00',
      email: settings?.email || 'contact@entreprise.com',
      logo: settings?.logo || ''
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
    const receptionData: ReceptionData = {
      reception: {
        id: reception.id,
        dateReception: reception.dateReception.toISOString(),
        statut: reception.statut,
        notes: reception.notes || undefined
      },
      chantier: {
        id: reception.chantier.id,
        chantierId: reception.chantier.chantierId,
        nomChantier: reception.chantier.nomChantier,
        clientNom: reception.chantier.client?.nom || 'Client non spécifié',
        adresseChantier: reception.chantier.adresseChantier || ''
      },
      remarques: reception.remarques.map(remarque => ({
        id: remarque.id,
        description: remarque.description,
        localisation: remarque.localisation,
        statut: remarque.statut,
        dateResolution: remarque.dateResolution?.toISOString(),
        assigneA: remarque.assigneA || undefined
      })),
      companySettings,
      userName: session.user.name || 'Utilisateur',
      logoBase64
    }

    // Générer le HTML
    const __locale = await bindRequestLocale()
    const htmlContent = localizeGeneratedHtml(__locale, generateReceptionHTML(receptionData), collectStrings(receptionData))

    // Générer le PDF avec Puppeteer
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    })

    console.log('✅ PDF généré avec succès')

    // Convertir le Buffer en Uint8Array pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reception-${reception.chantier.chantierId}-${reception.id}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF de réception:', error)
    return localizedJson(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
