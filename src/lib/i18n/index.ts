export type { AppLocale } from './locale'
export {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  UNATTENDED_LOCALE,
  bindLocale,
  getActiveLocale,
  intlLocale,
  parseLocale,
  runWithLocale,
  setClientLocale,
  writeLocaleCookie,
} from './locale'
export { collectStrings, hasPhrase, localizeGeneratedHtml, lookupPhrase, translateText, tx } from './translate'
