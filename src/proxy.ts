import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

// Note: La vérification des modules actifs est gérée côté client et dans les API routes
// Ce proxy se concentre sur l'authentification

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // console.log('🔍 Proxy - Chemin:', pathname);
  
  // Vérifier si on accède à /setup et si des utilisateurs existent déjà
  if (pathname === '/setup') {
    try {
      const setupCheckUrl = new URL('/api/setup', req.url);
      const response = await fetch(setupCheckUrl.toString());
      if (response.ok) {
        const data = await response.json();
        // Si des utilisateurs existent, rediriger vers login
        if (data.userCount > 0) {
          return NextResponse.redirect(new URL('/login', req.url));
        }
      }
    } catch {
      // En cas d'erreur, on laisse passer pour éviter les boucles
    }
    // Si pas d'utilisateurs, autoriser l'accès à /setup
    return NextResponse.next();
  }
  
  // Pages et ressources publiques
  if (
    pathname === '/login' ||
    pathname === '/logout' ||
    pathname === '/reset-password' ||
    pathname === '/clear-cache' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/health/') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/contrats/') || // Routes de signature de contrats (publiques)
    pathname.startsWith('/contrats/') || // Page de signature de contrats (publique)
    pathname.startsWith('/_next/') ||
    pathname.includes('.')
  ) {
    // console.log('✅ Chemin public autorisé:', pathname);
    return NextResponse.next();
  }
  
  // Vérifier si l'application nécessite une configuration initiale
  try {
    const setupCheckUrl = new URL('/api/setup', req.url);
    const response = await fetch(setupCheckUrl.toString());
    if (response.ok) {
      const { isConfigured } = await response.json();
      if (!isConfigured) {
        // console.log('🔧 Application non configurée - redirection vers setup');
        return NextResponse.redirect(new URL('/setup', req.url));
      }
    }
  } catch {
    // console.error('Erreur lors de la vérification de la configuration:', error);
    // En cas d'erreur, on assume que l'app est configurée et on continue vers la vérification d'auth
    // console.log('⚠️ Erreur de vérification config - on continue vers l\'authentification');
  }
  
  // Vérifier l'authentification avec NextAuth JWT
  let token
  try {
    token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
    })
  } catch (error) {
    console.error('❌ [Proxy] Erreur lors de la récupération du token:', error)
    const loginUrl = new URL('/login', req.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }
  
  console.log('🔐 [Proxy] Token trouvé:', !!token, 'Path:', pathname)
  if (token) {
    console.log('👤 [Proxy] Utilisateur:', token.email, 'ID:', token.id, 'Role:', token.role)
    
    // Vérification supplémentaire : s'assurer que le token a tous les champs requis
    if (!token.id || !token.email) {
      console.log('⚠️ [Proxy] Token incomplet - redirection vers login')
      console.log('⚠️ [Proxy] Token contenu:', { id: token.id, email: token.email, hasId: !!token.id, hasEmail: !!token.email })
      const loginUrl = new URL('/login', req.url)
      if (pathname !== '/') {
        loginUrl.searchParams.set('callbackUrl', pathname)
      }
      return NextResponse.redirect(loginUrl)
    }
  }
  
  // Si pas de token ou token invalide, rediriger vers login
  if (!token) {
    console.log('❌ [Proxy] Non authentifié - redirection vers login')
    console.log('❌ [Proxy] Cookies reçus:', req.cookies.getAll().map(c => c.name))
    const loginUrl = new URL('/login', req.url)
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }
  
  // Si authentifié et sur la racine, rediriger vers dashboard
  if (pathname === '/') {
    // console.log('🏠 Redirection racine vers dashboard');
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // La vérification des modules actifs est gérée côté client et dans les API routes
  // Le proxy se concentre sur l'authentification
  // console.log('✅ Accès autorisé');
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/chantiers/:path*',
    '/clients/:path*',
    '/sous-traitants/:path*',
    '/outillage/:path*',
    '/administratif/:path*',
    '/bons-regie/:path*',
    '/utilisateurs/:path*',
    '/planning/:path*',
    '/planning-ressources/:path*',
    '/configuration/:path*',
    '/mobile/:path*',
    '/inventory/:path*',
    '/journal/:path*',
    '/choix-clients/:path*',
    '/sav/:path*',
    '/metres/:path*',
    '/planification-chargements/:path*',
    '/admin/:path*',
    '/contrats/:path*' // Routes de signature de contrats (publiques)
  ],
};

