import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listerRegistre } from '@/lib/declarations/sous-traitance'

/** Registre des déclarations de sous-traitance : ?chantierId= &soustraitantId= */
export async function GET(request: Request) {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
  const sp = new URL(request.url).searchParams
  const entrees = await listerRegistre({
    chantierId: sp.get('chantierId') || undefined,
    soustraitantId: sp.get('soustraitantId') || undefined,
  })
  return localizedJson({ entrees })
}
