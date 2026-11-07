import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NotificationService } from '@/lib/services/notificationService'

// GET /api/notifications - Récupérer les notifications de l'utilisateur
export async function GET(request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const onlyUnread = searchParams.get('onlyUnread') === 'true'

    const result = await NotificationService.getUserNotifications(session.user.id, {
      limit,
      offset,
      onlyUnread,
    })

    return localizedJson(result)
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    )
  }
}

