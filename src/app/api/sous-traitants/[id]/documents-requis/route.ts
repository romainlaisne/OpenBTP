import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
// Documents exigés pour un sous-traitant (personnes et société).
// PUT { ouvrier?: string[] | null, societe?: string[] | null } — null = règle par défaut.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { CODES_OUVRIER, CODES_SOCIETE } from '@/lib/documents/types'

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (!session?.user) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await context.params
  const body = await request.json().catch(() => ({}))
  const data: Record<string, string | null> = {}
  for (const [cle, champ, codes] of [
    ['ouvrier', 'documentsRequisOuvrier', CODES_OUVRIER],
    ['societe', 'documentsRequisSociete', CODES_SOCIETE],
  ] as const) {
    if (body[cle] === undefined) continue
    if (body[cle] === null) {
      data[champ] = null
      continue
    }
    if (!Array.isArray(body[cle])) return localizedJson({ error: `${cle} doit être une liste` }, { status: 400 })
    const liste = [...new Set((body[cle] as unknown[]).map(String))].filter((c) => (codes as readonly string[]).includes(c))
    data[champ] = JSON.stringify(liste)
  }
  await prisma.soustraitant.update({ where: { id }, data })
  return localizedJson({ ok: true })
}
