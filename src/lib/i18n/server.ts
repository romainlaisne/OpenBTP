import { cookies } from 'next/headers'
import {
  bindLocale,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  parseLocale,
  UNATTENDED_LOCALE,
  type AppLocale,
} from './locale'

export async function getRequestLocale(): Promise<AppLocale> {
  try {
    const jar = await cookies()
    return parseLocale(jar.get(LOCALE_COOKIE)?.value) ?? DEFAULT_LOCALE
  } catch {
    return UNATTENDED_LOCALE
  }
}

/** Make synchronous formatters and tx() follow this request. */
export async function bindRequestLocale(): Promise<AppLocale> {
  const locale = await getRequestLocale()
  bindLocale(locale)
  return locale
}
