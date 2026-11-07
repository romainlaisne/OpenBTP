import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  await bindRequestLocale()
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const tasks = await prisma.admintask.findMany({
      where: {
        chantierId: chantierId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return localizedJson(tasks)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des tâches' },
      { status: 500 }
    )
  }
} 