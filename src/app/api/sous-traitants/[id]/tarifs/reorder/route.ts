import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function PUT(req: NextRequest) {
  await bindRequestLocale()
  const body: { id: string; ordre: number }[] = await req.json()
  await prisma.$transaction(
    body.map(({ id, ordre }) =>
      prisma.ligneTarifSousTraitant.update({ where: { id }, data: { ordre } })
    )
  )
  return localizedJson({ ok: true })
}
