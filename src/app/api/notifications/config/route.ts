import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/notifications/config - Récupérer la configuration de l'utilisateur
export async function GET(request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    // Seul un admin peut voir la config des autres utilisateurs
    if (userId !== session.user.id && session.user.role !== 'ADMIN') {
      return localizedJson({ error: 'Non autorisé' }, { status: 403 })
    }

    const configs = await prisma.notificationUserConfig.findMany({
      where: { userId },
      include: {
        notificationType: {
          select: {
            id: true,
            code: true,
            libelle: true,
            categorie: true,
          },
        },
      },
    })

    return localizedJson(configs)
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération de la configuration' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/config - Mettre à jour la configuration de l'utilisateur
export async function POST(request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, notificationTypeId, activeMail, activeInApp } = body

    const targetUserId = userId || session.user.id

    // Seul un admin peut modifier la config des autres utilisateurs
    if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') {
      return localizedJson({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier que le type de notification existe
    const notificationType = await prisma.notificationType.findUnique({
      where: { id: notificationTypeId },
    })

    if (!notificationType) {
      return localizedJson(
        { error: 'Type de notification non trouvé' },
        { status: 404 }
      )
    }

    // Créer ou mettre à jour la configuration
    const config = await prisma.notificationUserConfig.upsert({
      where: {
        userId_notificationTypeId: {
          userId: targetUserId,
          notificationTypeId,
        },
      },
      create: {
        userId: targetUserId,
        notificationTypeId,
        activeMail: activeMail ?? true,
        activeInApp: activeInApp ?? true,
      },
      update: {
        activeMail: activeMail ?? undefined,
        activeInApp: activeInApp ?? undefined,
      },
      include: {
        notificationType: {
          select: {
            code: true,
            libelle: true,
            categorie: true,
          },
        },
      },
    })

    return localizedJson(config)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration:', error)
    return localizedJson(
      { error: 'Erreur lors de la mise à jour de la configuration' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/config - Mettre à jour la configuration en masse
export async function PUT(request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, configs } = body as {
      userId?: string
      configs: Array<{
        notificationTypeId: string
        activeMail: boolean
        activeInApp: boolean
      }>
    }

    const targetUserId = userId || session.user.id

    // Seul un admin peut modifier la config des autres utilisateurs
    if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') {
      return localizedJson({ error: 'Non autorisé' }, { status: 403 })
    }

    // Mettre à jour toutes les configurations
    const results = await Promise.all(
      configs.map(config =>
        prisma.notificationUserConfig.upsert({
          where: {
            userId_notificationTypeId: {
              userId: targetUserId,
              notificationTypeId: config.notificationTypeId,
            },
          },
          create: {
            userId: targetUserId,
            notificationTypeId: config.notificationTypeId,
            activeMail: config.activeMail,
            activeInApp: config.activeInApp,
          },
          update: {
            activeMail: config.activeMail,
            activeInApp: config.activeInApp,
          },
        })
      )
    )

    return localizedJson({
      success: true,
      updated: results.length,
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour en masse:', error)
    return localizedJson(
      { error: 'Erreur lors de la mise à jour de la configuration' },
      { status: 500 }
    )
  }
}

