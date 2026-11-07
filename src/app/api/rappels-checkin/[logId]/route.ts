import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
// Détail d'un rappel Checkinatwork : l'email exact envoyé (texte, HTML) et la
// liste des chantiers communiqués ce jour-là. Lecture seule.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(_request: Request, context: { params: Promise<{ logId: string }> }) {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (!session?.user) return localizedJson({ error: 'Non autorisé' }, { status: 401 })

  const { logId } = await context.params
  const id = Number(logId)
  if (!Number.isInteger(id)) return localizedJson({ error: 'Identifiant invalide' }, { status: 400 })

  const rappel = await prisma.rappelCheckinLog.findUnique({ where: { id } })
  if (!rappel) return localizedJson({ error: 'Rappel introuvable' }, { status: 404 })

  let chantiers: unknown[] = []
  try {
    chantiers = JSON.parse(rappel.chantiersSnapshot)
  } catch {}
  return localizedJson({ ...rappel, chantiers })
}
