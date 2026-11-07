import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PATCH /api/crm/entreprises/[id]/rappels/[rappelId] - Mise à jour partielle d'un rappel
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string; rappelId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id, rappelId } = await props.params
    const body = await request.json()

    const rappel = await prisma.prospectRappel.findFirst({
      where: { id: rappelId, entrepriseId: id },
    })
    if (!rappel) {
      return localizedJson({ error: 'Rappel non trouvé' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.titre !== undefined) updateData.titre = body.titre
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.dateRappel !== undefined) updateData.dateRappel = new Date(body.dateRappel)
    if (body.statut !== undefined) updateData.statut = body.statut
    if (body.emailEnvoye !== undefined) updateData.emailEnvoye = !!body.emailEnvoye

    const updated = await prisma.prospectRappel.update({
      where: { id: rappelId },
      data: updateData,
    })

    return localizedJson(updated)
  } catch (error) {
    console.error('Erreur PATCH /api/crm/entreprises/[id]/rappels/[rappelId]:', error)
    return localizedJson(
      { error: 'Erreur lors de la mise à jour du rappel' },
      { status: 500 }
    )
  }
}

// DELETE /api/crm/entreprises/[id]/rappels/[rappelId] - Supprimer un rappel
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; rappelId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id, rappelId } = await props.params

    const rappel = await prisma.prospectRappel.findFirst({
      where: { id: rappelId, entrepriseId: id },
    })
    if (!rappel) {
      return localizedJson({ error: 'Rappel non trouvé' }, { status: 404 })
    }

    await prisma.prospectRappel.delete({ where: { id: rappelId } })

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/crm/entreprises/[id]/rappels/[rappelId]:', error)
    return localizedJson(
      { error: 'Erreur lors de la suppression du rappel' },
      { status: 500 }
    )
  }
}
