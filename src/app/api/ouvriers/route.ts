import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET - Récupérer la liste des ouvriers internes
export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est manager ou admin
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return localizedJson({ error: 'Non autorisé' }, { status: 403 })
    }

    const ouvriers = await prisma.ouvrierInterne.findMany({
      where: {
        actif: true
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true
      },
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' }
      ]
    })

    return localizedJson(ouvriers)
  } catch (error) {
    console.error('Erreur lors de la récupération des ouvriers:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des ouvriers' },
      { status: 500 }
    )
  }
}
