import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateGanttHTML } from '@/lib/pdf/templates/gantt-template'

export async function POST(request: NextRequest) {
  await bindRequestLocale()
  try {
    console.log('🎯 Génération PDF - Planning des chantiers')

    // 1. Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // 2. Récupérer les données du planning depuis le body de la requête
    const { chantiers, period, scale, filters } = await request.json()
    console.log(`✅ Données planning reçues: ${chantiers.length} chantiers, période: ${period}`)

    // 3. Récupérer les paramètres de l'entreprise
    console.log('🔍 Recherche des paramètres entreprise...')
    const companySettings = await PDFGenerator.getCompanySettings()
    console.log('✅ Paramètres entreprise récupérés')

    // 4. Générer le HTML
    console.log('🎨 Génération du HTML...')
    const html = generateGanttHTML({
      chantiers,
      period,
      scale,
      filters,
      companySettings
    })

    // 5. Générer le PDF avec Puppeteer
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(html, {
      format: 'A3',
      orientation: 'landscape',
      margins: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      }
    })

    console.log(`✅ PDF généré: ${pdfBuffer.length} bytes`)

    // 6. Retourner le PDF
    // Convertir le Buffer en Uint8Array pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Planning_Chantiers_${period.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error)
    return localizedJson(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}
