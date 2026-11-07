import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// DELETE /api/crm/entreprises/[id]/activites/[activiteId] - Supprimer une activité
export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string; activiteId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id, activiteId } = await props.params

    const activite = await prisma.prospectActivite.findFirst({
      where: { id: activiteId, entrepriseId: id },
    })
    if (!activite) {
      return localizedJson({ error: 'Activité non trouvée' }, { status: 404 })
    }

    await prisma.prospectActivite.delete({ where: { id: activiteId } })

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/crm/entreprises/[id]/activites/[activiteId]:', error)
    return localizedJson(
      { error: 'Erreur lors de la suppression de l\'activité' },
      { status: 500 }
    )
  }
}
