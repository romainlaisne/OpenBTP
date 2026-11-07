import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/fiches-techniques/dossiers?chantierId=xxx - Récupérer tous les dossiers d'un chantier
export async function GET(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chantierId = searchParams.get('chantierId')

    if (!chantierId) {
      return localizedJson({ error: 'chantierId requis' }, { status: 400 })
    }

    const dossiers = await prisma.dossierTechnique.findMany({
      where: {
        chantierId: chantierId
      },
      include: {
        fiches: {
          orderBy: { ordre: 'asc' }
        },
        User: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        dateGeneration: 'desc'
      }
    })

    return localizedJson(dossiers)
  } catch (error) {
    console.error('Erreur lors de la récupération des dossiers:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des dossiers' },
      { status: 500 }
    )
  }
}

