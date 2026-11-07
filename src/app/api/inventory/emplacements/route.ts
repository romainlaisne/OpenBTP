import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma/client'
import { prismaWithExtensions } from '@/lib/prisma/types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Obtenir tous les emplacements
export async function GET(request: NextRequest) {
  await bindRequestLocale()
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Paramètres de filtrage
    const searchParams = request.nextUrl.searchParams
    const rackId = searchParams.get('rackId')
    const statut = searchParams.get('statut')
    const codeQR = searchParams.get('codeQR')

    // Construire la requête
    let whereClause = {}
    
    if (rackId) {
      whereClause = { ...whereClause, rackId }
    }
    
    if (statut) {
      whereClause = { ...whereClause, statut }
    }
    
    if (codeQR) {
      whereClause = { ...whereClause, codeQR }
    }

    // Récupérer les emplacements
    const emplacements = await prismaWithExtensions.emplacement.findMany({
      where: whereClause,
      include: {
        rack: true,
        materiaux: true
      },
      orderBy: [
        { ligne: 'asc' },
        { colonne: 'asc' }
      ]
    })

    return localizedJson(emplacements)
  } catch (error) {
    console.error('Erreur lors de la récupération des emplacements:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des emplacements' },
      { status: 500 }
    )
  }
}

// Mettre à jour un emplacement
export async function PUT(request: NextRequest) {
  await bindRequestLocale()
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const data = await request.json()
    const { id, statut } = data

    if (!id) {
      return localizedJson(
        { error: 'ID d\'emplacement manquant' },
        { status: 400 }
      )
    }

    // Vérifier que l'emplacement existe
    const emplacement = await prismaWithExtensions.emplacement.findUnique({
      where: { id },
      include: { materiaux: true }
    })

    if (!emplacement) {
      return localizedJson(
        { error: 'Emplacement introuvable' },
        { status: 404 }
      )
    }

    // Mettre à jour l'emplacement
    const updatedEmplacement = await prismaWithExtensions.emplacement.update({
      where: { id },
      data: { statut },
      include: {
        rack: true,
        materiaux: true
      }
    })

    return localizedJson(updatedEmplacement)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'emplacement:', error)
    return localizedJson(
      { error: 'Erreur lors de la mise à jour de l\'emplacement' },
      { status: 500 }
    )
  }
}

// Rechercher un emplacement par code QR
export async function POST(request: NextRequest) {
  await bindRequestLocale()
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const data = await request.json()
    const { codeQR } = data

    if (!codeQR) {
      return localizedJson(
        { error: 'Code QR manquant' },
        { status: 400 }
      )
    }

    // D'abord, essayer de trouver un matériau avec ce code QR
    const materiau = await prismaWithExtensions.materiau.findUnique({
      where: { codeQR },
      include: {
        emplacement: {
          include: {
            rack: true
          }
        }
      }
    })

    if (materiau) {
      return localizedJson({
        type: 'materiau',
        data: materiau
      })
    }

    // Sinon, essayer de trouver un emplacement avec ce code QR
    const emplacement = await prismaWithExtensions.emplacement.findUnique({
      where: { codeQR },
      include: {
        rack: true,
        materiaux: true
      }
    })

    if (emplacement) {
      return localizedJson({
        type: 'emplacement',
        data: emplacement
      })
    }

    // Si rien n'est trouvé
    return localizedJson(
      { error: 'Aucun élément trouvé avec ce code QR' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Erreur lors de la recherche par code QR:', error)
    return localizedJson(
      { error: 'Erreur lors de la recherche par code QR' },
      { status: 500 }
    )
  }
} 