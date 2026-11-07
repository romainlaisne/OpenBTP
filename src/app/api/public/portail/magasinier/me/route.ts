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

    const magasinier = await prisma.magasinier.findUnique({
      where: { id: magasinierId },
      select: { id: true, nom: true }
    })

    if (!magasinier) {
      return localizedJson({ error: 'Magasinier introuvable' }, { status: 404 })
    }

    const aFaire = await prisma.tacheMagasinier.count({
      where: {
        magasinierId,
        statut: 'A_FAIRE',
        dateExecution: { lte: new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z') }
      }
    })

    return localizedJson({ magasinier, tachesAFaire: aFaire })
  } catch (error) {
    console.error('Erreur GET magasinier me:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
