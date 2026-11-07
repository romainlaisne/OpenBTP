import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request, { params }: { params: Promise<{ commandeId: string }> }) {
  await bindRequestLocale()
  try {
    const { commandeId } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const id = parseInt(commandeId, 10)
    if (isNaN(id)) {
      return localizedJson({ error: 'ID commande invalide' }, { status: 400 })
    }

    await prisma.commande.update({ where: { id }, data: { estCloturee: false, updatedAt: new Date() } })
    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur réouverture commande:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
 