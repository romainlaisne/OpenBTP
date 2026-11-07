import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST /api/sav/[id]/interventions
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    const body = await request.json()
    const { titre, description, type, dateDebut, dateFin, technicienId, materielsUtilises, coutMateriel, coutMainOeuvre } = body

    if (!titre || !dateDebut || !technicienId) return localizedJson({ error: 'Champs requis manquants' }, { status: 400 })

    const created = await prisma.interventionSAV.create({
      data: {
        ticketSAVId: id,
        titre: String(titre).trim(),
        description: description ? String(description).trim() : '',
        type: type || 'DIAGNOSTIC',
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        technicienId,
        materielsUtilises: materielsUtilises || null,
        coutMateriel: coutMateriel || 0,
        coutMainOeuvre: coutMainOeuvre || 0,
      }
    })

    return localizedJson(created, { status: 201 })
  } catch {
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

