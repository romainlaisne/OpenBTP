import { NextResponse } from 'next/server'
import { getActiveLocale } from './locale'
import { localizeApiBody } from './translate'

/**
 * JSON response whose error text follows the locale bound for this request.
 * Route handlers call `bindRequestLocale()` first. The original French
 * error string is kept on `code` when the visible text changes.
 */
export function localizedJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(localizeApiBody(getActiveLocale(), body), init)
}
