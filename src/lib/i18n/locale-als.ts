import { AsyncLocalStorage } from 'async_hooks'
import type { AppLocale } from './locale'

const storage = new AsyncLocalStorage<AppLocale>()

export function getStore(): AppLocale | undefined {
  return storage.getStore()
}

export function enterWith(locale: AppLocale) {
  storage.enterWith(locale)
}

export function run<T>(locale: AppLocale, fn: () => T): T {
  return storage.run(locale, fn)
}
