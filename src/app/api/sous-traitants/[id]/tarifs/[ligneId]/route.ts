import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; ligneId: string }> }) {
  await bindRequestLocale()
  const { ligneId } = await params
  const body = await req.json()

  const ligne = await prisma.ligneTarifSousTraitant.update({
    where: { id: ligneId },
    data: {
      ...(body.type !== undefined && { type: body.type }),
      ...(body.article !== undefined && { article: body.article || null }),
      ...(body.descriptif !== undefined && { descriptif: body.descriptif }),
      ...(body.unite !== undefined && { unite: body.unite || null }),
      ...(body.prixUnitaire !== undefined && { prixUnitaire: body.prixUnitaire != null ? Number(body.prixUnitaire) : null }),
      ...(body.remarques !== undefined && { remarques: body.remarques || null }),
    },
  })
  return localizedJson(ligne)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; ligneId: string }> }) {
  await bindRequestLocale()
  const { ligneId } = await params
  await prisma.ligneTarifSousTraitant.delete({ where: { id: ligneId } })
  return localizedJson({ ok: true })
}
