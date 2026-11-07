import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET - Récupérer tous les pays
export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const pays = await prisma.pays.findMany({
      include: {
        usines: true
      },
      orderBy: { nom: 'asc' }
    })

    return localizedJson(pays)
  } catch (error) {
    console.error('Erreur lors de la récupération des pays:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des pays' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau pays
export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { nom, code, icone } = await request.json()

    if (!nom || !code) {
      return localizedJson(
        { error: 'nom et code requis' },
        { status: 400 }
      )
    }

    const pays = await prisma.pays.create({
      data: {
        nom,
        code,
        icone
      }
    })

    return localizedJson(pays)
  } catch (error) {
    console.error('Erreur lors de la création du pays:', error)
    return localizedJson(
      { error: 'Erreur lors de la création du pays' },
      { status: 500 }
    )
  }
}
