import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { envoyerDeclaration, piecesDeclaration, TAILLE_MAX_PIECES, type ModeDeclaration } from '@/lib/declarations/sous-traitance'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Aperçu des pièces jointes : ?soustraitants=id1,id2
 * → par sous-traitant, les personnes actives, les pièces jointes et ce qui manque.
 */
export async function GET(request: Request) {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })

  const ids = (new URL(request.url).searchParams.get('soustraitants') || '').split(',').map((s) => s.trim()).filter(Boolean)
  const societes = await piecesDeclaration(ids)
  return localizedJson({
    tailleMax: TAILLE_MAX_PIECES,
    societes: societes.map((s) => ({
      id: s.id,
      nom: s.nom,
      tva: s.tva,
      personnes: s.personnes,
      pieces: s.pieces.map((p) => ({ personne: p.personne, libelle: p.libelle, nomFichier: p.nomFichier, taille: p.taille })),
      manques: s.manques,
    })),
  })
}

/** Envoi : { mode: 'simple' | 'documents', soustraitantIds: string[], destinataireEmail, zip?: boolean (défaut oui) } */
export async function POST(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })

    const { chantierId } = await props.params
    const body = await request.json()
    const mode: ModeDeclaration = body.mode === 'documents' ? 'documents' : 'simple'
    const soustraitantIds: string[] = Array.isArray(body.soustraitantIds) ? body.soustraitantIds.filter((x: unknown) => typeof x === 'string') : []
    const destinataire = typeof body.destinataireEmail === 'string' ? body.destinataireEmail.trim() : ''

    if (!soustraitantIds.length) return localizedJson({ error: 'Sélectionnez au moins un sous-traitant' }, { status: 400 })
    if (!EMAIL.test(destinataire)) return localizedJson({ error: 'Adresse email du destinataire invalide' }, { status: 400 })

    const r = await envoyerDeclaration({ chantierId, mode, soustraitantIds, destinataire, zip: body.zip !== false, userId: session.user?.id, userNom: session.user?.name || session.user?.email || undefined })
    if (!r.ok) return localizedJson({ error: r.erreur }, { status: r.status || 500 })
    return localizedJson({ success: true, attachmentsCount: r.pieces, zip: !!r.zip })
  } catch (error) {
    console.error("Erreur lors de l'envoi de la déclaration:", error)
    return localizedJson({ error: "Erreur lors de l'envoi de la déclaration" }, { status: 500 })
  }
}
