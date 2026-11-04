'use client'

import { useLocale } from '@/contexts/LocaleContext'

export function LanguageSwitch() {
  const { locale, setLocale, t } = useLocale()
  const nextLocale = locale === 'fr' ? 'en' : 'fr'

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      title={t('language.switch')}
      aria-label={t('language.switch')}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
    >
      <span aria-hidden="true">{locale === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
      <span>{locale.toUpperCase()}</span>
    </button>
  )
}