import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ soustraitantId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les paramètres de l'URL
    const { soustraitantId } = await context.params

    if (!soustraitantId) {
      return localizedJson(
        { error: 'ID du sous-traitant manquant' },
        { status: 400 }
      )
    }

    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id: soustraitantId }
    })

    if (!soustraitant) {
      return localizedJson(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    return localizedJson(soustraitant)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération du sous-traitant' },
      { status: 500 }
    )
  }
} 