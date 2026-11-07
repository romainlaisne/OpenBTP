import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

// GET /api/metres-plan/share/[token]
// Route publique (pas d'auth requise)
export async function GET(
  _request: Request,
  props: { params: Promise<{ token: string }> }
) {
  await bindRequestLocale()
  try {
    const { token } = await props.params

    const metrePlan = await prisma.metrePlan.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        nom: true,
        mplanUrl: true,
        pdfUrl: true,
        createdAt: true,
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
          },
        },
      },
    })

    if (!metrePlan) {
      return localizedJson({ error: 'Lien de partage invalide ou expiré' }, { status: 404 })
    }

    return localizedJson({
      ...metrePlan,
      fileUrl: `/api/metres-plan/share/${token}/file`,
    })
  } catch (error) {
    console.error('Erreur GET /api/metres-plan/share/[token]:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération du métré partagé' },
      { status: 500 }
    )
  }
}
