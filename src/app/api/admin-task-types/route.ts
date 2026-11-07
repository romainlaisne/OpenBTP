import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type AdminTaskTypeRow = {
  id: string
  taskType: string
  label: string
  category: string | null
  isActive: boolean | number
  ordre: number | null
  createdAt: Date
  updatedAt: Date
}

// GET /api/admin-task-types
// Récupère tous les types de tâches administratives
export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Utiliser $queryRaw pour éviter le problème de type
    const taskTypes = await prisma.$queryRaw<AdminTaskTypeRow[]>`
      SELECT * FROM admin_task_types
      ORDER BY ordre ASC
    `

    return localizedJson(taskTypes)
  } catch (error) {
    console.error('Erreur lors de la récupération des types de tâches:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des types de tâches' },
      { status: 500 }
    )
  }
}

// POST /api/admin-task-types
// Crée un nouveau type de tâche administrative
export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return localizedJson(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { taskType, label, category, isActive, ordre } = await request.json()

    if (!taskType || !label) {
      return localizedJson(
        { error: 'Le type et le libellé sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si le type existe déjà
    const existingTypes = await prisma.$queryRaw<AdminTaskTypeRow[]>`
      SELECT * FROM admin_task_types WHERE taskType = ${taskType} LIMIT 1
    `

    if (existingTypes && existingTypes.length > 0) {
      return localizedJson(
        { error: 'Ce type de tâche existe déjà' },
        { status: 400 }
      )
    }

    // Utiliser $executeRaw pour éviter les problèmes de type
    const now = new Date()
    const uuid = crypto.randomUUID()
    await prisma.$executeRaw`
      INSERT INTO admin_task_types (id, taskType, label, category, isActive, ordre, createdAt, updatedAt)
      VALUES (
        ${uuid},
        ${taskType},
        ${label},
        ${category || 'administrative'},
        ${isActive !== undefined ? isActive : true},
        ${ordre || 0},
        ${now},
        ${now}
      )
    `

    // Récupérer le type créé
    const createdType = await prisma.$queryRaw<AdminTaskTypeRow[]>`
      SELECT * FROM admin_task_types WHERE id = ${uuid}
    `

    return localizedJson(createdType[0])
  } catch (error) {
    console.error('Erreur lors de la création du type de tâche:', error)
    return localizedJson(
      { error: 'Erreur lors de la création du type de tâche' },
      { status: 500 }
    )
  }
} 