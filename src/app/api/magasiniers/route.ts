import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { ensureOuvrierInterneForMagasinier } from '@/lib/journalMagasinier'

export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const magasiniers = await prisma.magasinier.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' },
      include: {
        _count: { select: { taches: true } }
      }
    })

    return localizedJson(magasiniers)
  } catch (error) {
    console.error('Erreur GET magasiniers:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, pin } = body as { nom: string; pin?: string }

    if (!nom?.trim()) {
      return localizedJson({ error: 'Nom requis' }, { status: 400 })
    }

    const magasinier = await prisma.magasinier.create({
      data: {
        nom: nom.trim(),
        actif: true
      }
    })

    // Créer l'OuvrierInterne correspondant pour le journal (même id)
    await ensureOuvrierInterneForMagasinier(magasinier.id)

    // Créer l'accès PIN si fourni
    if (pin && String(pin).replace(/\D/g, '').length >= 4) {
      const codePIN = String(pin).replace(/\D/g, '').slice(0, 8)
      await prisma.publicAccessPIN.create({
        data: {
          subjectType: 'MAGASINIER',
          subjectId: magasinier.id,
          codePIN,
          estActif: true
        }
      })
    }

    return localizedJson(magasinier, { status: 201 })
  } catch (error) {
    console.error('Erreur POST magasiniers:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}
