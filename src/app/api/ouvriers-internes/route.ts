import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })

    const ouvriers = await prisma.ouvrierInterne.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' }
    })
    return localizedJson(ouvriers)
  } catch {
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    const body = await request.json()
    if (!body.nom || !body.prenom) {
      return localizedJson({ error: 'Nom et prénom requis' }, { status: 400 })
    }
    const created = await prisma.ouvrierInterne.create({
      data: {
        nom: String(body.nom).trim(),
        prenom: String(body.prenom).trim(),
        email: body.email || null,
        telephone: body.telephone || null,
        poste: body.poste || null,
        actif: body.actif !== false,
      }
    })
    return localizedJson(created, { status: 201 })
  } catch {
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
