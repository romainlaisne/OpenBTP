import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/etats-avancement/mois - Liste des mois distincts (pour filtre par période)
export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const rows = await prisma.etatAvancement.findMany({
      where: { mois: { not: null } },
      select: { mois: true },
      distinct: ['mois'],
      orderBy: { mois: 'desc' }
    })

    const mois = rows.map((r) => r.mois).filter((m): m is string => m != null && m.trim() !== '')
    return localizedJson(mois)
  } catch (error) {
    console.error('Erreur /api/etats-avancement/mois:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
