import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
// Catalogue des outils agent — consommé au démarrage par le serveur MCP.
// Auth : clé d'API uniquement (X-API-Key). Pas de session NextAuth ici.
import { NextResponse } from 'next/server'
import { requireAgentAuth } from '@/lib/agent/auth'
import { getToolCatalog } from '@/lib/agent/tools'

export const dynamic = 'force-dynamic'

/** Version du contrat. Changements additifs tant qu'on reste en "1". */
const CONTRACT_VERSION = '1'

export async function GET(request: Request) {
  await bindRequestLocale()
  const identity = await requireAgentAuth(request)
  if (!identity) {
    return localizedJson({ error: 'Non autorisé' }, { status: 401 })
  }

  return localizedJson({
    version: CONTRACT_VERSION,
    tools: getToolCatalog(),
  })
}
