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
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId },
      select: { id: true }
    })
    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    const commande = await prisma.$queryRaw<Array<{ id: number; estVerrouillee: number | boolean; tauxTVA: number }>>`
      SELECT * FROM commande_soustraitant
      WHERE id = ${parseInt(params.commandeId)}
      AND chantierId = ${chantier.id}
      AND soustraitantId = ${params.soustraitantId}
    `
    if (!commande || commande.length === 0) {
      return localizedJson({ error: 'Commande sous-traitant non trouvée' }, { status: 404 })
    }
    if (commande[0].estVerrouillee) {
      return localizedJson({ error: 'La commande est verrouillée' }, { status: 400 })
    }

    const body = await request.json()
    const {
      article = '',
      description = '',
      type = 'QP',
      unite = '',
      prixUnitaire = 0,
      quantite = 0,
      ordre = 0
    } = body

    const total = parseFloat(prixUnitaire) * parseFloat(quantite)

    // Insérer la nouvelle ligne
    await prisma.$executeRaw`
      INSERT INTO ligne_commande_soustraitant
        (commandeSousTraitantId, article, description, type, unite, prixUnitaire, quantite, total, ordre, createdAt, updatedAt)
      VALUES
        (${parseInt(params.commandeId)}, ${article}, ${description}, ${type}, ${unite},
         ${parseFloat(prixUnitaire)}, ${parseFloat(quantite)}, ${total}, ${ordre}, NOW(), NOW())
    `

    // Récupérer la ligne insérée
    const nouvelleLigne = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(params.commandeId)}
      ORDER BY id DESC
      LIMIT 1
    `

    // Recalculer les totaux (les TITRE/SOUS_TITRE ont total = 0, pas d'impact)
    const lignes = await prisma.$queryRaw<Array<{ total: string }>>`
      SELECT total FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(params.commandeId)}
    `
    const sousTotal = lignes.reduce((sum, l) => sum + parseFloat(l.total), 0)
    const tvaRate = typeof commande[0].tauxTVA === 'number' ? commande[0].tauxTVA : Number(commande[0].tauxTVA)
    const tva = sousTotal * (tvaRate || 0) / 100
    const totalCommande = sousTotal + tva

    await prisma.$executeRaw`
      UPDATE commande_soustraitant
      SET sousTotal = ${sousTotal}, tva = ${tva}, total = ${totalCommande}, updatedAt = NOW()
      WHERE id = ${parseInt(params.commandeId)}
    `

    return localizedJson(nouvelleLigne[0], { status: 201 })
  } catch (error) {
    console.error('Erreur création ligne commande ST:', error)
    return localizedJson({ error: 'Erreur lors de la création de la ligne' }, { status: 500 })
  }
}
