import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationService } from '@/lib/services/notificationService'

// PATCH /api/notifications/[id]/read - Marquer une notification comme lue
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params
    await NotificationService.markAsRead(id, session.user.id)

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur lors du marquage de la notification:', error)
    return localizedJson(
      { error: 'Erreur lors du marquage de la notification' },
      { status: 500 }
    )
  }
}

