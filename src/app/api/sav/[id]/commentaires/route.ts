import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST /api/sav/[id]/commentaires
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    const body = await request.json()
    const { contenu, type = 'COMMENTAIRE', estInterne = false } = body
    if (!contenu || !contenu.trim()) return localizedJson({ error: 'Contenu requis' }, { status: 400 })

    const created = await prisma.commentaireSAV.create({
      data: {
        ticketSAVId: id,
        contenu: String(contenu).trim(),
        type,
        estInterne: !!estInterne,
        auteurId: session.user.id,
      },
      include: { auteur: { select: { id: true, name: true, email: true } } }
    })
    return localizedJson(created, { status: 201 })
  } catch {
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

