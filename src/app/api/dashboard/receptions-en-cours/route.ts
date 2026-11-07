import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  await bindRequestLocale()
  try {
    const receptionsEnCours = await prisma.receptionChantier.findMany({
      where: {
        estFinalise: false, // On ne prend que les réceptions non finalisées
      },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            clientNom: true,
            client: {
              select: {
                nom: true
              }
            }
          }
        }
      },
      orderBy: {
        dateLimite: 'asc', // Optionnel: trier par date limite la plus proche
      },
      // take: 5, // Optionnel: limiter le nombre de résultats pour le widget
    })

    // Adapter les données au format attendu par le widget
    const formattedReceptions = receptionsEnCours.map(reception => ({
      id: reception.id,
      chantierId: reception.chantier.chantierId,
      nomChantier: reception.chantier.nomChantier,
      client: reception.chantier.client?.nom || reception.chantier.clientNom || 'N/A',
      dateReceptionPrevue: reception.dateLimite.toISOString(),
    }))

    return localizedJson(formattedReceptions)

  } catch (error) {
    console.error("Erreur lors de la récupération des réceptions en cours:", error)
    return localizedJson(
      { error: "Impossible de récupérer les réceptions en cours" },
      { status: 500 }
    )
  }
} 