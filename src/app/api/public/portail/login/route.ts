import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { signPortalSession, readPortalSessionFromCookie } from '@/app/public/portail/auth'
import bcrypt from 'bcryptjs'

type SubjectTypeInput = 'ouvrier' | 'soustraitant'
type SubjectEnumValue = 'OUVRIER_INTERNE' | 'SOUSTRAITANT'

function toSubjectEnum(type: SubjectTypeInput): SubjectEnumValue {
  return type === 'ouvrier' ? 'OUVRIER_INTERNE' : 'SOUSTRAITANT'
}

export async function GET(request: Request) {
  await bindRequestLocale()
  try {
    // Utiliser readPortalSessionFromCookie pour valider correctement le cookie signé HMAC
    const sess = readPortalSessionFromCookie(request.headers.get('cookie'))

    if (!sess || (sess.t !== 'OUVRIER_INTERNE' && sess.t !== 'SOUSTRAITANT')) {
      return localizedJson({ authenticated: false }, { status: 401 })
    }

    // Vérifier que le PIN existe toujours et est actif
    const access = await prisma.publicAccessPIN.findFirst({
      where: {
        subjectType: sess.t as SubjectEnumValue,
        subjectId: sess.id,
        estActif: true,
      }
    })

    if (!access) {
      return localizedJson({ authenticated: false }, { status: 401 })
    }

    // Récupérer le nom du sujet
    let subjectName = ''
    if (sess.t === 'OUVRIER_INTERNE') {
      const ouvrier = await prisma.ouvrierInterne.findUnique({
        where: { id: sess.id },
        select: { nom: true, prenom: true }
      })
      if (ouvrier) {
        subjectName = `${ouvrier.prenom || ''} ${ouvrier.nom || ''}`.trim()
      }
    } else if (sess.t === 'SOUSTRAITANT') {
      const soustraitant = await prisma.soustraitant.findUnique({
        where: { id: sess.id },
        select: { nom: true }
      })
      if (soustraitant) {
        subjectName = soustraitant.nom || ''
      }
    }

    return localizedJson({
      authenticated: true,
      token: {
        subjectType: sess.t as SubjectEnumValue,
        subjectId: sess.id,
        subjectName
      }
    })

  } catch (error) {
    console.error('Erreur vérification session portail:', error)
    return localizedJson({ authenticated: false }, { status: 500 })
  }
}

export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const { type, actorId, pin } = await request.json() as { type: SubjectTypeInput; actorId: string; pin: string }
    if (!type || !actorId || !pin) {
      return localizedJson({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const subjectType = toSubjectEnum(type)

    const access = await prisma.publicAccessPIN.findFirst({
      where: {
        subjectType,
        subjectId: actorId,
        estActif: true,
      }
    })

    if (!access || !(await bcrypt.compare(pin, access.codePIN))) {
      return localizedJson({ error: 'PIN invalide' }, { status: 401 })
    }

    const res = localizedJson({ ok: true })
    const value = signPortalSession(subjectType, actorId)

    res.cookies.set('portalSession', value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 heures
    })
    
    // En développement, ajouter aussi dans les headers pour localStorage
    if (process.env.NODE_ENV !== 'production') {
      res.headers.set('X-Portal-Session', value)
    }
    
    return res
  } catch (error) {
    console.error('Erreur login portail:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

