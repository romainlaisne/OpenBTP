import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStoredCommandePDFUrl } from '@/lib/pdf/commande-pdf-storage'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  props: { params: Promise<{ commandeId: string }> }
) {
  await bindRequestLocale()
  try {
    const params = await props.params
    const { commandeId } = params

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const pdfUrl = await getStoredCommandePDFUrl(parseInt(commandeId))

    if (!pdfUrl) {
      return localizedJson({ error: 'PDF stocké non trouvé' }, { status: 404 })
    }

    return localizedJson({ url: pdfUrl })
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du PDF stocké:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération du PDF stocké' },
      { status: 500 }
    )
  }
}

