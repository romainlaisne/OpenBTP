import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string }> }) {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return localizedJson({ error: 'Non autorisé' }, { status: 401 })
  }
  
  const { soustraitantId, etatId } = await context.params
  
  try {
    // Vérifier l'accès au chantier
    const userHasAccess = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        OR: [
          { role: 'ADMIN' },
          { role: 'MANAGER' },
        ]
      }
    })
    
    if (!userHasAccess) {
      return localizedJson({ error: 'Accès non autorisé' }, { status: 403 })
    }
    
    // Récupérer l'état d'avancement
    const etat = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(etatId),
        soustraitantId: soustraitantId,
      },
    })
    
    if (!etat) {
      return localizedJson({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }
    
    if (etat.estFinalise) {
      return localizedJson({ error: 'Cet état d\'avancement est déjà finalisé' }, { status: 400 })
    }
    
    // Finaliser l'état d'avancement
    const etatFinalise = await prisma.soustraitant_etat_avancement.update({
      where: {
        id: parseInt(etatId),
      },
      data: {
        estFinalise: true,
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true
      }
    })
    
    // Transformer la réponse pour correspondre à l'interface SoustraitantEtat
    const formattedEtat = {
      ...etatFinalise,
      lignes: etatFinalise.ligne_soustraitant_etat_avancement,
      avenants: etatFinalise.avenant_soustraitant_etat_avancement
    };
    
    return localizedJson(formattedEtat)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
} 