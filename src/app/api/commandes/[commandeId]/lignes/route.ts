import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ commandeId: string }> }) {
  await bindRequestLocale()
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const commandeId = parseInt(params.commandeId)

    if (isNaN(commandeId)) {
      return localizedJson({ error: 'ID de commande invalide' }, { status: 400 })
    }

    // Vérifier que la commande existe
    const commande = await prisma.commande.findUnique({
      where: { id: commandeId }
    })

    if (!commande) {
      return localizedJson({ error: 'Commande non trouvée' }, { status: 404 })
    }

    // Récupérer toutes les lignes pour cette commande
    const lignes = await prisma.ligneCommande.findMany({
      where: { commandeId },
      orderBy: { ordre: 'asc' }
    })

    return localizedJson(lignes)
  } catch (error) {
    console.error('Erreur lors de la récupération des lignes de commande:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des lignes de commande' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, props: { params: Promise<{ commandeId: string }> }) {
  await bindRequestLocale()
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const commandeId = parseInt(params.commandeId)

    if (isNaN(commandeId)) {
      return localizedJson({ error: 'ID de commande invalide' }, { status: 400 })
    }

    // Vérifier que la commande existe
    const commande = await prisma.commande.findUnique({
      where: { id: commandeId }
    })

    if (!commande) {
      return localizedJson({ error: 'Commande non trouvée' }, { status: 404 })
    }

    const lignesData = await request.json()

    if (!Array.isArray(lignesData)) {
      return localizedJson({ error: 'Format de données invalide' }, { status: 400 })
    }

    // Supprimer toutes les lignes existantes pour cette commande
    await prisma.ligneCommande.deleteMany({
      where: { commandeId }
    })

    // Créer les nouvelles lignes
    await prisma.ligneCommande.createMany({
      data: lignesData.map((ligne: { ordre?: number|string; article?: string; description?: string; type?: string; unite?: string; prixUnitaire?: number|string; quantite?: number|string; total?: number|string; estOption?: boolean }) => ({
        commandeId,
        ordre: Number(ligne.ordre) || 0,
        article: ligne.article || '',
        description: ligne.description || '',
        type: ligne.type || 'QP',
        unite: ligne.unite || 'Pièces',
        prixUnitaire: Number(ligne.prixUnitaire) || 0,
        quantite: Number(ligne.quantite) || 0,
        total: Number(ligne.total) || 0,
        estOption: Boolean(ligne.estOption)
      }))
    })

    // Récupérer les lignes créées
    const createdLignes = await prisma.ligneCommande.findMany({
      where: { commandeId },
      orderBy: { ordre: 'asc' }
    })

    return localizedJson(createdLignes)
  } catch (error) {
    console.error('Erreur lors de la création des lignes de commande:', error)
    return localizedJson(
      { error: 'Erreur lors de la création des lignes de commande' },
      { status: 500 }
    )
  }
} 