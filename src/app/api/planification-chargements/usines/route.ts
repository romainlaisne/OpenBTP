import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST - Créer une nouvelle usine
export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { nom, paysId } = await request.json()

    if (!nom || !paysId) {
      return localizedJson(
        { error: 'nom et paysId requis' },
        { status: 400 }
      )
    }

    const usine = await prisma.usine.create({
      data: {
        nom,
        paysId
      },
      include: {
        pays: true
      }
    })

    return localizedJson(usine)
  } catch (error) {
    console.error('Erreur lors de la création de l\'usine:', error)
    return localizedJson(
      { error: 'Erreur lors de la création de l\'usine' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une usine
export async function DELETE(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return localizedJson(
        { error: 'id requis' },
        { status: 400 }
      )
    }

    await prisma.usine.delete({
      where: { id }
    })

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'usine:', error)
    return localizedJson(
      { error: 'Erreur lors de la suppression de l\'usine' },
      { status: 500 }
    )
  }
}
