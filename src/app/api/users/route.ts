import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/users - Liste des utilisateurs (ADMIN et MANAGER)
export async function GET(request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    
    // Vérification de l'authentification
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Seuls les admins et managers peuvent voir tous les utilisateurs
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return localizedJson({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer les paramètres de pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const skip = (page - 1) * limit

    // Compter le total d'utilisateurs (sauf les BOTs)
    const total = await prisma.user.count({
      where: {
        role: {
          not: 'BOT'
        }
      }
    })

    // Récupérer les utilisateurs avec pagination (sauf les BOTs)
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: 'BOT'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
      skip,
      take: limit,
    })

    return localizedJson({
      users,
      total,
      page,
      limit
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    )
  }
}

// POST /api/users - Création d'un utilisateur (ADMIN ou MANAGER)
export async function POST(request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return localizedJson({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role } = body ?? {}

    if (!email || !password || !role) {
      return localizedJson(
        { error: 'Email, mot de passe et rôle sont obligatoires' },
        { status: 400 }
      )
    }

    const allowedRoles = new Set(['ADMIN', 'MANAGER', 'USER'])
    if (!allowedRoles.has(role)) {
      return localizedJson(
        { error: 'Rôle invalide' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return localizedJson(
        { error: 'Un utilisateur avec cet email existe déjà' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        password: hashedPassword,
        role,
        name: name || null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return localizedJson(newUser, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de l’utilisateur:', error)
    return localizedJson(
      { error: 'Erreur lors de la création de l’utilisateur' },
      { status: 500 }
    )
  }
}
