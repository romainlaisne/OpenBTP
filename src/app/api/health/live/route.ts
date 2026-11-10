import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Process liveness. Does not touch the database, so a database outage does not restart the pod. */
export function GET() {
  return NextResponse.json({ status: 'live' })
}
