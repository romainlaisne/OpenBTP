import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  await bindRequestLocale()
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer l'ID interne du chantier à partir de son ID lisible
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId },
      select: { id: true }
    })

    if (!chantier) {
      return localizedJson({ error: 'Chantier introuvable' }, { status: 404 })
    }

    // Vérifier que la commande existe
    const commande = await prisma.$queryRaw<Array<{ estVerrouillee: number | boolean }>>`
      SELECT * FROM commande_soustraitant
      WHERE id = ${parseInt(params.commandeId)}
      AND chantierId = ${chantier.id}
      AND soustraitantId = ${params.soustraitantId}
    `

    if (!commande || commande.length === 0) {
      return localizedJson(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Déjà déverrouillée (double clic, deux onglets) : le résultat voulu est
    // atteint, ce n'est pas une erreur
    if (!commande[0].estVerrouillee) {
      return localizedJson({ success: true, estVerrouillee: false, dejaDeverrouillee: true })
    }

    // Déverrouiller la commande
    await prisma.$executeRaw`
      UPDATE commande_soustraitant
      SET 
        estVerrouillee = false,
        statut = 'BROUILLON',
        updatedAt = NOW()
      WHERE id = ${parseInt(params.commandeId)}
    `

    // Réponse minimale : l'écran recharge la commande complète. (Renvoyer la
    // ligne brute pouvait échouer après coup et afficher une erreur alors que
    // le déverrouillage était bien fait.)
    return localizedJson({ success: true, estVerrouillee: false })
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors du déverrouillage de la commande sous-traitant' },
      { status: 500 }
    )
  }
} 