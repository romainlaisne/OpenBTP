import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  const { id } = await params
  const lignes = await prisma.ligneTarifSousTraitant.findMany({
    where: { soustraitantId: id },
    orderBy: { ordre: 'asc' },
  })
  return localizedJson(lignes)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  const { id } = await params
  const body = await req.json()

  const last = await prisma.ligneTarifSousTraitant.findFirst({
    where: { soustraitantId: id },
    orderBy: { ordre: 'desc' },
    select: { ordre: true },
  })
  const ordre = (last?.ordre ?? 0) + 1

  const ligne = await prisma.ligneTarifSousTraitant.create({
    data: {
      soustraitantId: id,
      ordre,
      type: body.type ?? 'LIGNE',
      article: body.article ?? null,
      descriptif: body.descriptif ?? '',
      unite: body.unite ?? null,
      prixUnitaire: body.prixUnitaire != null ? Number(body.prixUnitaire) : null,
      remarques: body.remarques ?? null,
    },
  })
  return localizedJson(ligne, { status: 201 })
}
