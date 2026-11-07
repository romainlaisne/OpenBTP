import { enterWith, getStore, run } from './locale-als'

export type AppLocale = 'fr' | 'en'

export const LOCALE_COOKIE = 'openbtp-locale'
/** Staff UI default when the user has not chosen a language. */
export const DEFAULT_LOCALE: AppLocale = 'en'
/**
 * Scheduled work has no language selection. Keep the historical French copy
 * for those jobs so unattended mail does not change language on its own.
 */
export const UNATTENDED_LOCALE: AppLocale = 'fr'

let browserLocale: AppLocale = DEFAULT_LOCALE

export function parseLocale(value: string | null | undefined): AppLocale | null {
  if (value === 'fr' || value === 'en') return value
  return null
}

export function intlLocale(locale: AppLocale): string {
  return locale === 'en' ? 'en-GB' : 'fr-FR'
}

export function getActiveLocale(): AppLocale {
  if (typeof window !== 'undefined') return browserLocale
  return getStore() ?? DEFAULT_LOCALE
}

export function setClientLocale(locale: AppLocale) {
  browserLocale = locale
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

/** Bind the locale for the current request's async continuation. */
export function bindLocale(locale: AppLocale) {
  if (typeof window !== 'undefined') browserLocale = locale
  else enterWith(locale)
}

export function runWithLocale<T>(locale: AppLocale, fn: () => T): T {
  return run(locale, fn)
}

export function writeLocaleCookie(locale: AppLocale) {
  if (typeof document === 'undefined') return
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}
