import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { readPortalSessionFromCookie, unauthorized } from '@/app/public/portail/auth'

export async function GET(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  await bindRequestLocale()
  const { type, actorId } = await props.params
  if (type !== 'soustraitant') return localizedJson({ error: 'Type non supporté' }, { status: 400 })

  const session = readPortalSessionFromCookie(request.headers.get('cookie'))
  if (!session || session.t !== 'SOUSTRAITANT' || session.id !== actorId) {
    return unauthorized()
  }

  const { searchParams } = new URL(request.url)
  const chantierId = searchParams.get('chantierId')
  if (!chantierId) return localizedJson({ error: 'chantierId requis' }, { status: 400 })

  try {
    const commande = await prisma.commandeSousTraitant.findFirst({
      where: { soustraitantId: actorId, chantierId },
      select: {
        id: true,
        lignes: {
          select: { id: true, article: true, description: true, type: true, unite: true, prixUnitaire: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!commande) return localizedJson({ data: [], commandeId: null })

    const base = commande.lignes.map(l => ({
      ligneCommandeId: l.id,
      article: l.article,
      description: l.description,
      type: l.type,
      unite: l.unite,
      prixUnitaire: l.prixUnitaire,
      quantite: 0,
      estSupplement: false
    }))

    return localizedJson({ data: base, commandeId: commande.id })
  } catch {
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
