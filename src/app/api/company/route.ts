import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return localizedJson({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const c = await prisma.companysettings.findFirst()
    if (!c) return localizedJson({}, { status: 200 })
    return localizedJson({
      name: c.name,
      address: c.address,
      zipCode: c.zipCode,
      city: c.city,
      phone: c.phone,
      email: c.email,
      tva: c.tva,
      iban: c.iban,
      logo: c.logo || null,
      logoSquare: c.logoSquare || null,
    })
  } catch {
    return localizedJson({ error: 'Erreur récupération société' }, { status: 500 })
  }
}

