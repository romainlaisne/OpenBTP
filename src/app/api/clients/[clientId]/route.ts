import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/clients/[clientId] - Récupère un client spécifique
export async function GET(request: Request, props: { params: Promise<{ clientId: string }> }) {
  await bindRequestLocale()
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson(
        { error: 'Vous devez être connecté pour accéder à cette ressource' },
        { status: 401 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: params.clientId },
      include: {
        Chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            dateDebut: true,
            statut: true,
            budget: true,
            adresseChantier: true
          },
          orderBy: {
            dateDebut: 'desc'
          }
        }
      }
    })

    if (!client) {
      return localizedJson(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    return localizedJson(client)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération du client' },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[clientId] - Met à jour un client
export async function PUT(request: Request, props: { params: Promise<{ clientId: string }> }) {
  await bindRequestLocale()
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson(
        { error: 'Vous devez être connecté pour modifier un client' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const client = await prisma.client.update({
      where: { id: params.clientId },
      data: {
        nom: body.nom,
        email: body.email || null,
        telephone: body.telephone || null,
        adresse: body.adresse || null,
        numeroTva: body.numeroTva || null
      },
      include: {
        Chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            dateDebut: true,
            statut: true,
            budget: true,
            adresseChantier: true
          },
          orderBy: {
            dateDebut: 'desc'
          }
        }
      }
    })

    return localizedJson(client)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la mise à jour du client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[clientId] - Supprime un client
export async function DELETE(request: Request, props: { params: Promise<{ clientId: string }> }) {
  await bindRequestLocale()
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    await prisma.client.delete({
      where: { id: params.clientId }
    })

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la suppression du client' },
      { status: 500 }
    )
  }
} 