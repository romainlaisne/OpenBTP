import { enGB, fr } from 'date-fns/locale'
import { getActiveLocale, type AppLocale } from './locale'

/** date-fns locale for the active language. Weekday names change; callers keep their own week-start rules. */
export function dateFnsLocale(locale: AppLocale = getActiveLocale()) {
  return locale === 'en' ? enGB : fr
}
