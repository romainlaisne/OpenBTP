import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
// Recopie sur le NAS les documents en vigueur pas encore présents dans le
// miroir (premier démarrage, NAS momentanément indisponible…). ADMIN.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resynchroniserMiroirNas } from '@/lib/documents/stockage'

export async function POST() {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return localizedJson({ error: 'Réservé aux administrateurs' }, { status: 403 })
  const r = await resynchroniserMiroirNas()
  if (!r.actif) return localizedJson({ error: 'Miroir NAS non configuré (NAS_DOCUMENTS_HOST_PATH dans .env).' }, { status: 409 })
  return localizedJson(r)
}
