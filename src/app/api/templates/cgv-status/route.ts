import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
// Statut du template CGV actif (utilisé par la page devis pour la case "Inclure les CGV")
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const template = await prisma.contractTemplate.findFirst({
      where: { category: 'CGV', isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { name: true },
    })

    return localizedJson({ actif: !!template, nom: template?.name ?? null })
  } catch (error) {
    console.error('Erreur statut CGV:', error)
    return localizedJson({ actif: false, nom: null })
  }
}
