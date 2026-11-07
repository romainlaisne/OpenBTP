import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    const magasinier = await prisma.magasinier.findUnique({
      where: { id },
      include: { _count: { select: { taches: true } } }
    })

    if (!magasinier) {
      return localizedJson({ error: 'Magasinier introuvable' }, { status: 404 })
    }

    return localizedJson(magasinier)
  } catch (error) {
    console.error('Erreur GET magasinier:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    const body = await request.json()
    const { nom, actif } = body as { nom?: string; actif?: boolean }

    const magasinier = await prisma.magasinier.update({
      where: { id },
      data: {
        ...(nom !== undefined && { nom: String(nom).trim() }),
        ...(actif !== undefined && { actif })
      }
    })

    return localizedJson(magasinier)
  } catch (error) {
    console.error('Erreur PATCH magasinier:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    await prisma.magasinier.update({
      where: { id },
      data: { actif: false }
    })

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur DELETE magasinier:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
