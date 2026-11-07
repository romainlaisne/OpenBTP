import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import bcrypt from 'bcryptjs'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
  const rec = await prisma.publicAccessPIN.findFirst({ where: { subjectType: 'OUVRIER_INTERNE', subjectId: id, estActif: true } })
  return localizedJson({ hasPin: !!rec })
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)
    if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    const body = await request.json().catch(()=> ({})) as { pin?: string }
    if (!body.pin || body.pin.length < 4) return localizedJson({ error: 'PIN invalide' }, { status: 400 })
    const pinHash = await bcrypt.hash(body.pin, 12)
    const rec = await prisma.publicAccessPIN.findFirst({ where: { subjectType: 'OUVRIER_INTERNE', subjectId: id } })
    if (rec) {
      await prisma.publicAccessPIN.update({ where: { id: rec.id }, data: { codePIN: pinHash, estActif: true } })
    } else {
      await prisma.publicAccessPIN.create({ data: { subjectType: 'OUVRIER_INTERNE', subjectId: id, codePIN: pinHash, estActif: true } })
    }
    return localizedJson({ ok: true })
  } catch {
    return localizedJson({ error: 'Erreur mise à jour PIN' }, { status: 500 })
  }
}

