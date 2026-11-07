import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  await bindRequestLocale()
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const pin = searchParams.get('pin')

    if (!id || !pin) {
      return localizedJson(
        { error: 'ID de réception et code PIN requis' },
        { status: 400 }
      )
    }

    // Vérifier si la réception existe et si le code PIN correspond
    const reception = await prisma.$queryRaw`
      SELECT id, codePIN FROM reception_chantier
      WHERE id = ${id} AND codePIN = ${pin}
    `

    // reception sera un tableau, vide si aucune correspondance n'est trouvée
    if (Array.isArray(reception) && reception.length === 0) {
      return localizedJson(
        { error: 'Code PIN invalide ou réception inexistante' },
        { status: 401 }
      )
    }

    return localizedJson(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur lors de la vérification du PIN:', error)
    return localizedJson(
      { error: 'Erreur serveur lors de la vérification du code PIN' },
      { status: 500 }
    )
  }
} 