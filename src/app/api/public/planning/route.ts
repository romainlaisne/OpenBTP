import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { readPortalSessionFromCookie, unauthorized } from '@/app/public/portail/auth'

// GET /api/public/planning?subjectType=OUVRIER_INTERNE|SOUSTRAITANT&subjectId&from&to
export async function GET(request: NextRequest) {
  await bindRequestLocale()
  const portalSession = readPortalSessionFromCookie(request.headers.get('cookie'))
  if (!portalSession) return unauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const subjectType = searchParams.get('subjectType')
    const subjectId = searchParams.get('subjectId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!subjectType || !subjectId) return localizedJson({ error: 'Paramètres manquants' }, { status: 400 })

    // Vérifier que l'utilisateur accède uniquement à ses propres données
    if (portalSession.id !== subjectId) return unauthorized()

    const where: Record<string, unknown> = {}
    if (from || to) {
      where.AND = [] as unknown[]
      if (from) (where.AND as unknown[]).push({ end: { gte: new Date(from) } })
      if (to) (where.AND as unknown[]).push({ start: { lte: new Date(to) } })
    }
    if (subjectType === 'OUVRIER_INTERNE') {
      where.ouvriersInternes = { some: { ouvrierInterneId: subjectId } }
    } else if (subjectType === 'SOUSTRAITANT') {
      where.sousTraitants = { some: { soustraitantId: subjectId } }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { start: 'asc' },
      select: { id: true, title: true, start: true, end: true, status: true, chantierId: true }
    })
    return localizedJson({ data: tasks })
  } catch {
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
