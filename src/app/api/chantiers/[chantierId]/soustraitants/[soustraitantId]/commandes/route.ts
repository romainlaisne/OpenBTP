import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string }> }
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

    // 1. Récupérer l'ID interne du chantier à partir de son ID lisible
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId },
      select: { id: true }
    });

    if (!chantierData) {
      return localizedJson({ error: 'Chantier non trouvé pour cet ID lisible' }, { status: 404 });
    }
    const chantierIdInterne = chantierData.id;

    // Utiliser Prisma pour récupérer les commandes sous-traitant (sécurisé)
    const commandes = await prisma.commandeSousTraitant.findMany({
      where: {
        chantierId: chantierIdInterne,
        soustraitantId: params.soustraitantId
      },
      include: {
        Chantier: {
          select: {
            nomChantier: true
          }
        },
        soustraitant: {
          select: {
            nom: true,
            email: true
          }
        }
      },
      orderBy: {
        dateCommande: 'desc'
      }
    })

    // Pour chaque commande, récupérer ses lignes avec Prisma
    const commandesAvecLignes = await Promise.all(commandes.map(async (commande) => {
      const lignes = await prisma.ligneCommandeSousTraitant.findMany({
        where: {
          commandeSousTraitantId: commande.id
        },
        orderBy: {
          ordre: 'asc'
        }
      })

      return {
        ...commande,
        lignes: lignes
      }
    }))

    return localizedJson(commandesAvecLignes)
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string }> }
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

    const body = await request.json()
    const { lignes, reference, tauxTVA } = body

    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return localizedJson(
        { error: 'Les lignes de commande sont requises' },
        { status: 400 }
      )
    }

    // Calculer les totaux (en excluant les titres et sous-titres)
    let sousTotal = 0
    type LigneIn = { article: string; description: string; type?: string; unite: string; prixUnitaire: number; quantite: number }
    const lignesAvecTotal = (lignes as LigneIn[]).map((ligne, index: number) => {
      const typeLigne = ligne.type || 'QP'
      const isSection = typeLigne === 'TITRE' || typeLigne === 'SOUS_TITRE'
      
      // Pour les titres et sous-titres, mettre tout à 0
      if (isSection) {
        return {
          ...ligne,
          ordre: index + 1,
          prixUnitaire: 0,
          quantite: 0,
          total: 0,
          unite: ''
        }
      }
      
      // Pour les lignes normales, calculer le total
      const total = ligne.prixUnitaire * ligne.quantite
      sousTotal += total
      return {
        ...ligne,
        ordre: index + 1,
        total
      }
    })

    const tva = sousTotal * (tauxTVA || 0) / 100
    const total = sousTotal + tva

    // Récupérer l'ID interne du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId },
      select: { id: true }
    });

    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 });
    }

    // Créer la commande avec Prisma et récupérer l'ID
    const created = await prisma.commandeSousTraitant.create({
      data: {
        chantierId: chantier.id,
        soustraitantId: params.soustraitantId,
        dateCommande: new Date(),
        reference: reference || null,
        tauxTVA: typeof tauxTVA === 'number' ? tauxTVA : 0,
        sousTotal,
        tva,
        total,
        statut: 'BROUILLON',
        estVerrouillee: false,
      },
      select: { id: true }
    })

    const commandeId = created.id

    // Créer les lignes de commande
    await prisma.ligneCommandeSousTraitant.createMany({
      data: lignesAvecTotal.map((ligne) => {
        const typeLigne = ligne.type || 'QP'
        const isSection = typeLigne === 'TITRE' || typeLigne === 'SOUS_TITRE'
        
        return {
          commandeSousTraitantId: commandeId,
          ordre: ligne.ordre,
          article: ligne.article,
          description: ligne.description,
          type: typeLigne,
          unite: isSection ? '' : ligne.unite,
          prixUnitaire: isSection ? 0 : ligne.prixUnitaire,
          quantite: isSection ? 0 : ligne.quantite,
          total: isSection ? 0 : ligne.total,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })
    })

    // Récupérer la commande complète avec Prisma
    const commandeComplete = await prisma.commandeSousTraitant.findUnique({
      where: { id: commandeId },
      include: {
        Chantier: {
          select: {
            nomChantier: true
          }
        },
        soustraitant: {
          select: {
            nom: true,
            email: true
          }
        },
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        }
      }
    })

    if (!commandeComplete) {
      return localizedJson({ error: 'Erreur lors de la récupération de la commande créée' }, { status: 500 });
    }

    return localizedJson(commandeComplete)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la création de la commande sous-traitant' },
      { status: 500 }
    )
  }
} 