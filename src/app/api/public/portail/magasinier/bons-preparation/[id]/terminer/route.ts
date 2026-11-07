import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getMagasinierIdFromCookie } from '@/app/public/portail/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  try {
    const magasinierId = getMagasinierIdFromCookie(request.headers.get('cookie'))
    if (!magasinierId) {
      return localizedJson({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que le bon appartient bien à ce magasinier
    const bon = await prisma.bonPreparation.findFirst({
      where: { id, magasinierId },
    })

    if (!bon) {
      return localizedJson({ error: 'Bon non trouvé' }, { status: 404 })
    }

    await prisma.bonPreparation.update({
      where: { id },
      data: { statut: 'TERMINE' },
    })

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur POST terminer bon-preparation:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
