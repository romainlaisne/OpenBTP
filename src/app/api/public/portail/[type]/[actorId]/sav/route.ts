import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { readPortalSessionFromCookie, unauthorized } from '@/app/public/portail/auth'

export async function GET(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  await bindRequestLocale()
  const { type, actorId } = await props.params
  const sess = readPortalSessionFromCookie(request.headers.get('cookie'))
  if (!sess) return unauthorized()

  const isOuvrier = type === 'ouvrier'
  if ((isOuvrier && sess.t !== 'OUVRIER_INTERNE') || (!isOuvrier && sess.t !== 'SOUSTRAITANT') || sess.id !== actorId) {
    return unauthorized()
  }

  const where = isOuvrier ? { ouvrierInterneAssignId: actorId } : { soustraitantAssignId: actorId }
  const tickets = await prisma.ticketSAV.findMany({
    where,
    orderBy: { dateDemande: 'desc' },
    select: {
      id: true,
      numTicket: true,
      titre: true,
      description: true,
      priorite: true,
      statut: true,
      dateDemande: true
    }
  })
  return localizedJson(tickets)
}

