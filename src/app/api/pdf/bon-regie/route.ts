import { bindRequestLocale } from '@/lib/i18n/server'
import { collectStrings, localizeGeneratedHtml } from '@/lib/i18n/translate'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateBonRegieHTML, type BonRegieData } from '@/lib/pdf/templates/bon-regie-template'

export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { bonRegieId } = body

    if (!bonRegieId) {
      return localizedJson({ error: 'ID du bon de régie manquant' }, { status: 400 })
    }

    // Récupérer les données du bon de régie
    const bonRegie = await prisma.$queryRaw`
      SELECT * FROM bonRegie WHERE id = ${bonRegieId}
    `

    if (!Array.isArray(bonRegie) || bonRegie.length === 0) {
      return localizedJson({ error: 'Bon de régie non trouvé' }, { status: 404 })
    }

    const rawData = bonRegie[0] as Record<string, unknown>

    const bonRegieData: BonRegieData = {
      id: rawData.id as string | number,
      dates: rawData.dates as string | null,
      client: rawData.client as string | null,
      nomChantier: rawData.nomChantier as string | null,
      description: rawData.description as string | null,
      tempsChantier: rawData.tempsChantier as number | null,
      nombreTechniciens: rawData.nombreTechniciens as number | null,
      materiaux: rawData.materiaux as string | null,
      nomSignataire: rawData.nomSignataire as string | null,
      signature: rawData.signature as string | null,
      dateSignature: rawData.dateSignature ? String(rawData.dateSignature) : null,
      chantierId: rawData.chantierId as string | null,
    }

    // Récupérer les paramètres de l'entreprise (logo inclus)
    const companySettings = await PDFGenerator.getCompanySettings()

    // Générer le HTML avec le template amélioré
    const __locale = await bindRequestLocale()
    const html = localizeGeneratedHtml(__locale, generateBonRegieHTML(bonRegieData, companySettings), collectStrings(bonRegieData))

    // Générer le PDF via Puppeteer (comme tous les autres PDFs du projet)
    const pdfBuffer = await PDFGenerator.generatePDF(html, {
      format: 'A4',
      orientation: 'portrait',
      margins: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    })

    // Si le bon de régie est associé à un chantier, sauvegarder le PDF comme document du chantier
    if (bonRegieData.chantierId) {
      const pdfFileName = `bon-regie-${bonRegieData.id}-${Date.now()}.pdf`

      try {
        await prisma.document.create({
          data: {
            nom: `Bon de régie — ${bonRegieData.client || ''} — ${bonRegieData.dates || ''}`,
            type: 'BON_REGIE',
            mimeType: 'application/pdf',
            url: `/uploads/${pdfFileName}`,
            taille: pdfBuffer.length,
            chantierId: bonRegieData.chantierId,
            createdBy: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })

        const uploadsDir = path.join(process.cwd(), 'public/uploads')
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true })
        }
        fs.writeFileSync(path.join(uploadsDir, pdfFileName), pdfBuffer)
      } catch (err) {
        console.error('Erreur lors de la sauvegarde du PDF comme document:', err)
      }
    }

    const uint8Array = new Uint8Array(pdfBuffer)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bon-regie-${bonRegieData.id}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    return localizedJson({ error: 'Erreur lors de la génération du PDF' }, { status: 500 })
  }
}
