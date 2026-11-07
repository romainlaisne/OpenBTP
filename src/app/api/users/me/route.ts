import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/users/me - Récupère les informations de l'utilisateur connecté
export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return localizedJson(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      return localizedJson(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    return localizedJson(user)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: "Erreur lors de la récupération des informations de l'utilisateur" },
      { status: 500 }
    )
  }
}

// PUT /api/users/me - Met à jour les informations de l'utilisateur connecté
export async function PUT(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return localizedJson(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return localizedJson(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // L'utilisateur ne peut pas changer son propre rôle
    const { role: _unusedRole, ...updateData } = body
    void _unusedRole;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return localizedJson(updatedUser)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: "Erreur lors de la mise à jour des informations de l'utilisateur" },
      { status: 500 }
    )
  }
} 