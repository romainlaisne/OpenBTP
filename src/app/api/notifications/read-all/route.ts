import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationService } from '@/lib/services/notificationService'

// POST /api/notifications/read-all - Marquer toutes les notifications comme lues
export async function POST(_request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    await NotificationService.markAllAsRead(session.user.id)

    return localizedJson({ success: true })
  } catch (error) {
    console.error('Erreur lors du marquage de toutes les notifications:', error)
    return localizedJson(
      { error: 'Erreur lors du marquage de toutes les notifications' },
      { status: 500 }
    )
  }
}

