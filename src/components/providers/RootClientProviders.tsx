'use client'

import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import AuthProvider from './AuthProvider'
import ChatSystemProvider from './ChatProvider'
import { FeaturesProvider } from '@/hooks/useFeatures'
import { LocaleProvider } from '@/contexts/LocaleContext'
import type { AppLocale } from '@/lib/i18n/locale'

export default function RootClientProviders({ children, initialLocale = 'en' }: { children: React.ReactNode; initialLocale?: AppLocale }) {
  const pathname = usePathname() || '/'

  const isPublicPortal = pathname.startsWith('/public/portail')
  const isContractPage = pathname.startsWith('/contrats/')
  // Page Checkinatwork des sous-traitants (lien des rappels) : publique, protégée par son jeton
  const isCheckinPage = pathname.startsWith('/checkin/')

  // Pages d'authentification : ne pas utiliser SessionProvider pour éviter les appels à /api/auth/session
  const isAuthPage = pathname === '/login' || pathname === '/reset-password' || pathname === '/setup'

  if (isPublicPortal || isContractPage || isCheckinPage) {
    return (
      <LocaleProvider initialLocale={initialLocale} uiTranslationsEnabled={!isPublicPortal}>
        {children}
        <Toaster position="top-right" />
      </LocaleProvider>
    )
  }

  // Sur les pages d'authentification, ne pas utiliser AuthProvider (qui contient SessionProvider)
  // pour éviter les appels à /api/auth/session qui créent des boucles infinies
  if (isAuthPage) {
    return (
      <LocaleProvider initialLocale={initialLocale}>
        {children}
        <Toaster position="top-right" />
      </LocaleProvider>
    )
  }

  return (
    <LocaleProvider initialLocale={initialLocale}>
      <AuthProvider>
        <FeaturesProvider>
          {children}
          <ChatSystemProvider />
          <Toaster position="top-right" />
        </FeaturesProvider>
      </AuthProvider>
    </LocaleProvider>
  )
}

