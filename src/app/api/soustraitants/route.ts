import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const activeOnly = ['1','true','yes'].includes((searchParams.get('activeOnly')||'').toLowerCase())

    let sousTraitantsDb: Array<{ id: string }> | []
    try {
      sousTraitantsDb = await prisma.soustraitant.findMany({ orderBy: { nom: 'asc' } })
    } catch {
      sousTraitantsDb = []
    }

    // Récupération fiable de la colonne actif
    let actifById: Record<string, boolean> = {}
    try {
      const rows = await prisma.$queryRawUnsafe('SELECT id, actif FROM soustraitant') as Array<{ id: string, actif: number | null }>
      actifById = Object.fromEntries(rows.map(r => [r.id, r.actif === null ? true : !!r.actif]))
    } catch {}

    const result = (sousTraitantsDb || []).map((st) => ({
      ...st,
      actif: actifById[st.id] ?? true,
    }))

    const filtered = activeOnly ? result.filter(st => st.actif) : result
    return localizedJson(filtered)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des sous-traitants' },
      { status: 500 }
    )
  }
} 