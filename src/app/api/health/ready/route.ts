import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Readiness. A database error is reported as "not-ready" with no connection details. */
export async function GET() {
  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    return NextResponse.json({ status: 'ready' })
  } catch {
    return NextResponse.json({ status: 'not-ready' }, { status: 503 })
  }
}
