import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/chantiers/[chantierId]/gestionnaires - Récupérer les gestionnaires d'un chantier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId } = await params

    const gestionnaires = await prisma.chantierGestionnaire.findMany({
      where: { chantierId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return localizedJson(gestionnaires)
  } catch (error) {
    console.error('Erreur lors de la récupération des gestionnaires:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/chantiers/[chantierId]/gestionnaires - Ajouter un gestionnaire
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Seuls les ADMIN et MANAGER peuvent ajouter des gestionnaires
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return localizedJson({ error: 'Permission refusée' }, { status: 403 })
    }

    const { chantierId } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return localizedJson({ error: 'userId requis' }, { status: 400 })
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
    })

    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return localizedJson({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Vérifier si le gestionnaire n'existe pas déjà
    const existingGestionnaire = await prisma.chantierGestionnaire.findUnique({
      where: {
        chantierId_userId: {
          chantierId,
          userId,
        },
      },
    })

    if (existingGestionnaire) {
      return localizedJson(
        { error: 'Cet utilisateur est déjà gestionnaire de ce chantier' },
        { status: 409 }
      )
    }

    // Créer le gestionnaire
    const gestionnaire = await prisma.chantierGestionnaire.create({
      data: {
        chantierId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return localizedJson(gestionnaire, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de l\'ajout du gestionnaire:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/chantiers/[chantierId]/gestionnaires - Retirer un gestionnaire
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Seuls les ADMIN et MANAGER peuvent retirer des gestionnaires
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return localizedJson({ error: 'Permission refusée' }, { status: 403 })
    }

    const { chantierId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return localizedJson({ error: 'userId requis' }, { status: 400 })
    }

    // Vérifier que le gestionnaire existe
    const gestionnaire = await prisma.chantierGestionnaire.findUnique({
      where: {
        chantierId_userId: {
          chantierId,
          userId,
        },
      },
    })

    if (!gestionnaire) {
      return localizedJson({ error: 'Gestionnaire non trouvé' }, { status: 404 })
    }

    // Supprimer le gestionnaire
    await prisma.chantierGestionnaire.delete({
      where: {
        id: gestionnaire.id,
      },
    })

    return localizedJson({ success: true, message: 'Gestionnaire retiré avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du gestionnaire:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

