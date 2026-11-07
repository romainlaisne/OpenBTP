import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getMagasinierIdFromCookie } from '@/app/public/portail/auth'

export async function GET(request: NextRequest) {
  await bindRequestLocale()
  try {
    const magasinierId = getMagasinierIdFromCookie(request.headers.get('cookie'))
    if (!magasinierId) {
      return localizedJson({ error: 'Non authentifié' }, { status: 401 })
    }

    const bons = await prisma.bonPreparation.findMany({
      where: { magasinierId, statut: 'A_FAIRE' },
      orderBy: { createdAt: 'desc' },
    })

    return localizedJson(bons)
  } catch (error) {
    console.error('Erreur GET bons-preparation portail:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
