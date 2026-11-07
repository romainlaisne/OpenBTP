import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
// « Envoyer le rappel maintenant » : tous les sous-traitants actifs, ou un seul.
// Respecte le mode des réglages (test → adresse de test ; désactivé → rien).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executerRappels } from '@/lib/checkin/envoi'

const ROLES = ['ADMIN', 'MANAGER']

export async function POST(request: Request) {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (!session?.user || !ROLES.includes(session.user.role)) {
    return localizedJson({ error: 'Non autorisé' }, { status: 403 })
  }
  const body = await request.json().catch(() => ({}))
  const soustraitantId = typeof body.soustraitantId === 'string' && body.soustraitantId ? body.soustraitantId : undefined

  try {
    const r = await executerRappels({ declencheur: 'MANUEL', soustraitantId })
    if (!r.execute) return localizedJson({ error: r.raison, ...r }, { status: 409 })
    return localizedJson(r)
  } catch (error) {
    console.error('Erreur envoi rappels Checkinatwork:', error)
    return localizedJson({ error: 'Erreur lors de l\'envoi des rappels' }, { status: 500 })
  }
}
