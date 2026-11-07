import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/crm/entreprises/[id]/activites - Créer une activité pour une entreprise
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    const body = await request.json()

    if (!body.type) {
      return localizedJson(
        { error: 'Le type d\'activité est requis' },
        { status: 400 }
      )
    }
    if (!body.description) {
      return localizedJson(
        { error: 'La description de l\'activité est requise' },
        { status: 400 }
      )
    }

    const entreprise = await prisma.prospectEntreprise.findUnique({ where: { id } })
    if (!entreprise) {
      return localizedJson({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    const activite = await prisma.prospectActivite.create({
      data: {
        entrepriseId: id,
        type: body.type,
        description: body.description,
        date: body.date ? new Date(body.date) : new Date(),
        creePar: session.user.id,
      },
      include: {
        createur: {
          select: { name: true },
        },
      },
    })

    return localizedJson(activite, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/crm/entreprises/[id]/activites:', error)
    return localizedJson(
      { error: 'Erreur lors de la création de l\'activité' },
      { status: 500 }
    )
  }
}
