import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'

export async function POST() {
  await bindRequestLocale()
  try {
    const res = localizedJson({ success: true })
    
    // Supprimer le cookie portalSession
    res.cookies.set('portalSession', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0, // Expire immédiatement
    })
    
    return res
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
    return localizedJson({ error: 'Erreur lors de la déconnexion' }, { status: 500 })
  }
}
