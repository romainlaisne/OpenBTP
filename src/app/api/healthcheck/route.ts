import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'

export async function GET() {
  await bindRequestLocale()
  return localizedJson({ status: 'ok' })
} 