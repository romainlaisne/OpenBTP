import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma/client'
import { prismaWithExtensions } from '@/lib/prisma/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Obtenir tous les matériaux
export async function GET(request: NextRequest) {
  await bindRequestLocale()
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Paramètre de recherche
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')

    let whereClause = {}
    if (search) {
      whereClause = {
        OR: [
          { nom: { contains: search } },
          { description: { contains: search } }
        ]
      }
    }

    // Récupérer les matériaux
    const materiaux = await prismaWithExtensions.materiau.findMany({
      where: whereClause,
      include: {
        emplacement: {
          include: {
            rack: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return localizedJson(materiaux)
  } catch (error) {
    console.error('Erreur lors de la récupération des matériaux:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des matériaux' },
      { status: 500 }
    )
  }
}

// Créer un nouveau matériau
export async function POST(request: NextRequest) {
  await bindRequestLocale()
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les données du matériau
    const data = await request.json()
    const { nom, description, quantite, emplacementId } = data

    if (!nom) {
      return localizedJson(
        { error: 'Nom de matériau manquant' },
        { status: 400 }
      )
    }

    // Vérifier que l'emplacement existe si spécifié
    if (emplacementId) {
      const emplacement = await prismaWithExtensions.emplacement.findUnique({
        where: { id: emplacementId }
      })

      if (!emplacement) {
        return localizedJson(
          { error: 'Emplacement introuvable' },
          { status: 404 }
        )
      }

      // Mettre à jour le statut de l'emplacement
      await prismaWithExtensions.emplacement.update({
        where: { id: emplacementId },
        data: { statut: 'occupé' }
      })
    }

    // Générer un code QR unique pour le matériau
    const codeQR = `MAT-${Date.now()}`

    // Créer le matériau
    const materiau = await prismaWithExtensions.materiau.create({
      data: {
        nom,
        description,
        quantite: quantite || 1,
        codeQR,
        emplacementId
      },
      include: {
        emplacement: {
          include: {
            rack: true
          }
        }
      }
    })

    return localizedJson(materiau)
  } catch (error) {
    console.error('Erreur lors de la création du matériau:', error)
    return localizedJson(
      { error: 'Erreur lors de la création du matériau' },
      { status: 500 }
    )
  }
} 