import phrasesEn from './phrases.en.json'
import { getActiveLocale, type AppLocale } from './locale'

const phrases = phrasesEn as Record<string, string>

const phraseKeysByLength = Object.keys(phrases).sort((a, b) => b.length - a.length)

function apostropheVariants(value: string): string[] {
  const straight = value.replace(/’/g, "'")
  const curly = value.replace(/'/g, '’')
  return straight === curly ? [value] : [value, straight, curly]
}

export function lookupPhrase(text: string): string | undefined {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  for (const variant of apostropheVariants(trimmed)) {
    const hit = phrases[variant]
    if (hit) return hit
  }
  return undefined
}

export function hasPhrase(text: string): boolean {
  return lookupPhrase(text) !== undefined
}

function translateDynamic(text: string): string | null {
  if (text.startsWith('Chantier : ')) return `Project: ${text.slice('Chantier : '.length)}`
  if (text.startsWith('Visite du ')) return `Visit on ${text.slice('Visite du '.length)}`
  if (text.startsWith('Ouvrier chez ')) return `Worker at ${text.slice('Ouvrier chez '.length)}`

  const created = text.match(/^Créé le (.+) par (.+)$/)
  if (created) return `Created on ${created[1]} by ${created[2]}`

  const measurement = text.match(/^Métré soumis par (.+) pour (.+)$/)
  if (measurement) return `Measurement submitted by ${measurement[1]} for ${measurement[2]}`

  const count = text.match(/^(\d+) types de notifications initialisés$/)
  if (count) return `${count[1]} notification types initialised`

  return null
}

/**
 * Translate a French source string. French locale returns the source.
 * Unknown English strings are returned unchanged so user content is preserved.
 */
export function translateText(locale: AppLocale, text: string): string {
  if (!text || locale === 'fr') return text
  const leading = text.match(/^\s*/)?.[0] ?? ''
  const trailing = text.match(/\s*$/)?.[0] ?? ''
  const content = text.slice(leading.length, text.length - trailing.length || undefined)
  const translated = lookupPhrase(content) ?? translateDynamic(content) ?? content
  return `${leading}${translated}${trailing}`
}

/** Client/server helper bound to the active locale. */
export function tx(text: string): string {
  return translateText(getActiveLocale(), text)
}

const BOUNDARY = '(?<![\\p{L}\\p{N}_-])'
const BOUNDARY_END = '(?![\\p{L}\\p{N}_-])'

/**
 * Replace catalog phrases in static markup. Callers must pass user-entered
 * strings in `protectedValues` so names and notes are not rewritten.
 */
export function localizeGeneratedHtml(locale: AppLocale, html: string, protectedValues: Array<string | null | undefined> = [], minLength = 2): string {
  if (locale !== 'en' || !html) return html
  const tokens = new Map<string, string>()
  let out = html
  const unique = [...new Set(protectedValues.filter((value): value is string => !!value && value.length > 1))]
  unique.sort((a, b) => b.length - a.length)
  unique.forEach((value, index) => {
    if (!out.includes(value)) return
    const token = `\u0000P${index}\u0000`
    out = out.split(value).join(token)
    tokens.set(token, value)
  })

  for (const phrase of phraseKeysByLength) {
    if (phrase.length < minLength || !out.includes(phrase)) continue
    const english = phrases[phrase]
    if (!english || english === phrase) continue
    const pattern = new RegExp(`${BOUNDARY}${escapeRegExp(phrase)}${BOUNDARY_END}`, 'gu')
    out = out.replace(pattern, english)
  }

  for (const [token, value] of tokens) out = out.split(token).join(value)
  return out
}

export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out))
  else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectStrings(item, out))
  }
  return out
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function localizeApiBody(locale: AppLocale, body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body
  const record = { ...(body as Record<string, unknown>) }
  for (const field of ['error', 'message', 'erreur', 'details'] as const) {
    const value = record[field]
    if (typeof value !== 'string') continue
    if (field !== 'error' && field !== 'erreur' && !hasPhrase(value)) continue
    const translated = translateText(locale, value)
    if (translated === value) continue
    if (field === 'error' && typeof record.code !== 'string') record.code = value
    record[field] = translated
  }
  return record
}
