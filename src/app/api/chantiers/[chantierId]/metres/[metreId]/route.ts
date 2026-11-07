import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET: Récupérer un métré spécifique
export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; metreId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const params = await props.params

    const metre = await prisma.metreChantier.findFirst({
      where: {
        id: params.metreId,
        chantierId: params.chantierId,
      },
      include: {
        categories: {
          include: {
            lignes: {
              orderBy: { ordre: 'asc' },
            },
          },
          orderBy: { ordre: 'asc' },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!metre) {
      return localizedJson(
        { error: 'Métré non trouvé' },
        { status: 404 }
      )
    }

    return localizedJson(metre)
  } catch (error) {
    console.error('Erreur lors du chargement du métré:', error)
    return localizedJson(
      { error: 'Erreur lors du chargement du métré' },
      { status: 500 }
    )
  }
}

// PATCH: Mettre à jour un métré
export async function PATCH(
  request: Request,
  props: { params: Promise<{ chantierId: string; metreId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const params = await props.params
    const body = await request.json()

    const { date, commentaire, categories } = body as {
      date?: string
      commentaire?: string | null
      categories?: Array<{
        id?: string
        nom: string
        unite: string
        ordre: number
        lignes: Array<{
          id?: string
          description: string
          unite: string
          longueur?: number | null
          largeur?: number | null
          hauteur?: number | null
          quantite: number
          notes?: string | null
          ordre: number
        }>
      }>
    }

    // Vérifier que le métré existe
    const existingMetre = await prisma.metreChantier.findFirst({
      where: {
        id: params.metreId,
        chantierId: params.chantierId,
      },
    })

    if (!existingMetre) {
      return localizedJson(
        { error: 'Métré non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour le métré avec transaction
    const metre = await prisma.$transaction(async (tx) => {
      // Mettre à jour les champs de base
      await tx.metreChantier.update({
        where: { id: params.metreId },
        data: {
          ...(date && { date: new Date(date) }),
          ...(commentaire !== undefined && { commentaire: commentaire || null }),
        },
      })

      // Si des catégories sont fournies, les mettre à jour
      if (categories) {
        // Supprimer toutes les catégories existantes (et leurs lignes par cascade)
        await tx.metreCategorie.deleteMany({
          where: { metreChantierId: params.metreId },
        })

        // Recréer les catégories et leurs lignes
        for (const cat of categories) {
          await tx.metreCategorie.create({
            data: {
              metreChantierId: params.metreId,
              nom: cat.nom,
              unite: cat.unite,
              ordre: cat.ordre,
              lignes: {
                create: cat.lignes.map((ligne) => ({
                  description: ligne.description,
                  unite: ligne.unite,
                  longueur: ligne.longueur || null,
                  largeur: ligne.largeur || null,
                  hauteur: ligne.hauteur || null,
                  quantite: ligne.quantite,
                  notes: ligne.notes || null,
                  ordre: ligne.ordre,
                })),
              },
            },
          })
        }
      }

      // Récupérer le métré complet
      return await tx.metreChantier.findUnique({
        where: { id: params.metreId },
        include: {
          categories: {
            include: {
              lignes: {
                orderBy: { ordre: 'asc' },
              },
            },
            orderBy: { ordre: 'asc' },
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    })

    return localizedJson(metre)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du métré:', error)
    return localizedJson(
      { error: 'Erreur lors de la mise à jour du métré' },
      { status: 500 }
    )
  }
}

// DELETE: Supprimer un métré
export async function DELETE(
  request: Request,
  props: { params: Promise<{ chantierId: string; metreId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const params = await props.params

    // Vérifier que le métré existe
    const existingMetre = await prisma.metreChantier.findFirst({
      where: {
        id: params.metreId,
        chantierId: params.chantierId,
      },
    })

    if (!existingMetre) {
      return localizedJson(
        { error: 'Métré non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le métré (les catégories et lignes seront supprimées par cascade)
    await prisma.metreChantier.delete({
      where: { id: params.metreId },
    })

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression du métré:', error)
    return localizedJson(
      { error: 'Erreur lors de la suppression du métré' },
      { status: 500 }
    )
  }
}

