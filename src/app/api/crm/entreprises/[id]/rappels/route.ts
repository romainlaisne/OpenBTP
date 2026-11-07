import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/crm/entreprises/[id]/rappels - Liste de tous les rappels d'une entreprise
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params

    const entreprise = await prisma.prospectEntreprise.findUnique({ where: { id } })
    if (!entreprise) {
      return localizedJson({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    const rappels = await prisma.prospectRappel.findMany({
      where: { entrepriseId: id },
      orderBy: { dateRappel: 'asc' },
    })

    return localizedJson(rappels)
  } catch (error) {
    console.error('Erreur GET /api/crm/entreprises/[id]/rappels:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des rappels' },
      { status: 500 }
    )
  }
}

// POST /api/crm/entreprises/[id]/rappels - Créer un rappel pour une entreprise
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

    if (!body.titre) {
      return localizedJson(
        { error: 'Le titre du rappel est requis' },
        { status: 400 }
      )
    }
    if (!body.dateRappel) {
      return localizedJson(
        { error: 'La date du rappel est requise' },
        { status: 400 }
      )
    }

    const entreprise = await prisma.prospectEntreprise.findUnique({ where: { id } })
    if (!entreprise) {
      return localizedJson({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    const rappel = await prisma.prospectRappel.create({
      data: {
        entrepriseId: id,
        titre: body.titre,
        description: body.description || null,
        dateRappel: new Date(body.dateRappel),
        statut: 'EN_ATTENTE',
        creePar: session.user.id,
      },
    })

    return localizedJson(rappel, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/crm/entreprises/[id]/rappels:', error)
    return localizedJson(
      { error: 'Erreur lors de la création du rappel' },
      { status: 500 }
    )
  }
}
