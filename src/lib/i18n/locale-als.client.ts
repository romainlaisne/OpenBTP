import type { AppLocale } from './locale'

export function getStore(): AppLocale | undefined {
  return undefined
}

export function enterWith(_locale: AppLocale) {}

export function run<T>(_locale: AppLocale, fn: () => T): T {
  return fn()
}
