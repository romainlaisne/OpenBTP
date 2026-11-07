import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dateToISOString } from '@/utils/format'

// Interface pour typer les résultats de la requête SQL brute
interface ReceptionResult {
  id: string
  dateCreation: string | Date
  dateLimite: string | Date
  estFinalise: number | boolean
  nomChantier: string
  adresseChantier: string
  name: string | null
  email: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Pour les autres propriétés potentielles
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    // Attendre la Promise params
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    const { searchParams } = new URL(request.url)
    const pin = searchParams.get('pin')

    if (!id || !pin) {
      return localizedJson(
        { error: 'ID de réception et code PIN requis' },
        { status: 400 }
      )
    }

    // Vérifier d'abord le PIN
    const checkPin = await prisma.$queryRaw`
      SELECT id FROM reception_chantier
      WHERE id = ${id} AND codePIN = ${pin}
    `

    if (Array.isArray(checkPin) && checkPin.length === 0) {
      return localizedJson(
        { error: 'Code PIN invalide ou réception inexistante' },
        { status: 401 }
      )
    }

    // Récupérer les informations de la réception
    const reception = await prisma.$queryRaw<ReceptionResult[]>`
      SELECT 
        rc.*,
        c.nomChantier,
        c.adresseChantier,
        u.name,
        u.email
      FROM reception_chantier rc
      LEFT JOIN Chantier c ON rc.chantierId = c.chantierId
      LEFT JOIN User u ON rc.createdBy = u.id
      WHERE rc.id = ${id}
    `

    if (Array.isArray(reception) && reception.length === 0) {
      return localizedJson(
        { error: 'Réception non trouvée' },
        { status: 404 }
      )
    }

    const result = reception[0]
    
    // Formatter la réponse
    return localizedJson({
      id: result.id,
      dateCreation: dateToISOString(result.dateCreation),
      dateLimite: dateToISOString(result.dateLimite),
      estFinalise: result.estFinalise === 1 || result.estFinalise === true,
      chantier: {
        nomChantier: result.nomChantier,
        adresseChantier: result.adresseChantier
      },
      createdBy: {
        name: result.name,
        email: result.email
      }
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de la réception:', error)
    return localizedJson(
      { error: 'Erreur serveur lors de la récupération de la réception' },
      { status: 500 }
    )
  }
} 