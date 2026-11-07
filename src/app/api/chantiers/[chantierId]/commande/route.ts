import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  await bindRequestLocale()
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!params.chantierId) {
      return localizedJson({ error: 'ID du chantier manquant' }, { status: 400 })
    }

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: {
        chantierId: params.chantierId
      }
    })

    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer la commande validée
    const commande = await prisma.commande.findFirst({
      where: {
        chantierId: chantier.id,
        statut: 'VALIDEE'
      },
      include: {
        lignes: true
      }
    })

    if (!commande) {
      return localizedJson({ error: 'Aucune commande validée trouvée' }, { status: 404 })
    }

    return localizedJson(commande)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération de la commande' },
      { status: 500 }
    )
  }
} 