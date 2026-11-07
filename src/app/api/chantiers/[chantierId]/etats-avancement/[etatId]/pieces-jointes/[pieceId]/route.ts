import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supprimerPiece, trouverEtat } from '@/lib/etats/pieces-jointes'

// DELETE : retirer une pièce jointe — seulement tant que l'état n'est pas finalisé
export async function DELETE(_request: Request, props: { params: Promise<{ chantierId: string; etatId: string; pieceId: string }> }) {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
  const { chantierId, etatId, pieceId } = await props.params
  const etat = await trouverEtat(chantierId, etatId)
  if (!etat) return localizedJson({ error: 'État introuvable' }, { status: 404 })
  if (etat.estFinalise) {
    return localizedJson({ error: "L'état est finalisé : ses pièces jointes ne peuvent plus être retirées" }, { status: 409 })
  }
  const ok = await supprimerPiece(etat.id, parseInt(pieceId, 10) || 0)
  if (!ok) return localizedJson({ error: 'Pièce jointe introuvable' }, { status: 404 })
  return localizedJson({ success: true })
}
