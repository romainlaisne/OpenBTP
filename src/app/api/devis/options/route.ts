import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/devis/options - Récupère les options pour les filtres (tous les devis sans pagination)
export async function GET(request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const devis = await prisma.devis.findMany({
      select: {
        id: true,
        numeroDevis: true,
        montantTTC: true,
        statut: true,
        client: {
          select: {
            id: true,
            nom: true,
            email: true
          }
        }
      },
      orderBy: {
        dateCreation: 'desc'
      }
    })

    return localizedJson(devis)
  } catch (error) {
    console.error('Erreur lors de la récupération des options de devis:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des options de devis' },
      { status: 500 }
    )
  }
}

