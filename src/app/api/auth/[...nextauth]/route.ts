import { bindRequestLocale } from '@/lib/i18n/server'
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'

const handler = NextAuth(authOptions)

// Wrapper pour gérer les erreurs et logger les problèmes
export async function GET(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  await bindRequestLocale()
  try {
    return await handler(req, context)
  } catch (error) {
    console.error('❌ [NextAuth] Erreur GET /api/auth:', error)
    // Ne pas rediriger ici, laisser NextAuth gérer
    return handler(req, context)
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  await bindRequestLocale()
  try {
    const params = await context.params
    const action = params.nextauth?.[0]
    
    console.log('📨 [NextAuth] POST request:', action, 'URL:', req.url)
    console.log('📨 [NextAuth] Headers:', {
      'content-type': req.headers.get('content-type'),
      'cookie': req.headers.get('cookie') ? 'Présent' : 'Absent',
      'origin': req.headers.get('origin'),
      'referer': req.headers.get('referer')
    })
    
    const response = await handler(req, context)
    
    // Vérifier les cookies dans la réponse
    const setCookieHeaders = response.headers.getSetCookie()
    console.log('🍪 [NextAuth] Cookies définis dans la réponse:', setCookieHeaders.length > 0 ? setCookieHeaders.map(c => c.split(';')[0]) : 'Aucun cookie')
    
    return response
  } catch (error) {
    console.error('❌ [NextAuth] Erreur POST /api/auth:', error)
    // Ne pas rediriger ici, laisser NextAuth gérer
    return handler(req, context)
  }
} 