import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export const dynamic = 'force-dynamic'

// GET - Récupérer la géolocalisation d'un chantier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId } = await params

    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: {
        latitude: true,
        longitude: true
      }
    })

    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    return localizedJson({
      success: true,
      latitude: chantier.latitude,
      longitude: chantier.longitude,
      hasLocation: chantier.latitude !== null && chantier.longitude !== null
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de la géolocalisation:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération de la géolocalisation' },
      { status: 500 }
    )
  }
}

// PUT - Enregistrer ou mettre à jour la géolocalisation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId } = await params
    const body = await request.json()
    const { latitude, longitude } = body

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return localizedJson(
        { error: 'Latitude et longitude doivent être des nombres' },
        { status: 400 }
      )
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    })

    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Mettre à jour la géolocalisation
    const updatedChantier = await prisma.chantier.update({
      where: { chantierId },
      data: {
        latitude,
        longitude
      },
      select: {
        latitude: true,
        longitude: true
      }
    })

    return localizedJson({
      success: true,
      latitude: updatedChantier.latitude,
      longitude: updatedChantier.longitude
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la géolocalisation:', error)
    return localizedJson(
      { error: 'Erreur lors de la mise à jour de la géolocalisation' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer la géolocalisation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId } = await params

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    })

    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Supprimer la géolocalisation
    await prisma.chantier.update({
      where: { chantierId },
      data: {
        latitude: null,
        longitude: null
      }
    })

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression de la géolocalisation:', error)
    return localizedJson(
      { error: 'Erreur lors de la suppression de la géolocalisation' },
      { status: 500 }
    )
  }
}

