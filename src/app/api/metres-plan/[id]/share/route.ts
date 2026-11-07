import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST /api/metres-plan/[id]/share — génère un token de partage
export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const shareToken = crypto.randomUUID()

    await prisma.metrePlan.update({
      where: { id },
      data: { shareToken },
    })

    return localizedJson({
      shareUrl: `/share/metres-plan/${shareToken}`,
      shareToken,
    })
  } catch (error) {
    console.error('Erreur POST /api/metres-plan/[id]/share:', error)
    return localizedJson(
      { error: 'Erreur lors de la génération du lien de partage' },
      { status: 500 }
    )
  }
}

// DELETE /api/metres-plan/[id]/share — révoque le token de partage
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    await prisma.metrePlan.update({
      where: { id },
      data: { shareToken: null },
    })

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/metres-plan/[id]/share:', error)
    return localizedJson(
      { error: 'Erreur lors de la révocation du lien de partage' },
      { status: 500 }
    )
  }
}
