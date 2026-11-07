import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { notifier } from '@/lib/services/notificationService'

// GET /api/metres/[id] - Récupérer un métré par ID
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await props.params

    const metre = await prisma.metreSoustraitant.findUnique({
      where: { id },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            clientNom: true,
          }
        },
        soustraitant: {
          select: {
            id: true,
            nom: true,
            email: true,
          }
        },
        lignes: {
          orderBy: { createdAt: 'asc' }
        },
        commande: {
          select: {
            id: true,
            reference: true,
          }
        }
      }
    })

    if (!metre) {
      return localizedJson({ error: 'Métré non trouvé' }, { status: 404 })
    }

    return localizedJson(metre)
  } catch (error) {
    console.error('Erreur lors de la récupération du métré:', error)
    return localizedJson(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PATCH /api/metres/[id] - Mettre à jour le statut ou le chantier du métré
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est ADMIN ou MANAGER
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return localizedJson({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id } = await props.params
    const body = await request.json()
    const { statut, chantierId } = body as { statut?: string; chantierId?: string }

    // Récupérer le métré actuel
    const metreActuel = await prisma.metreSoustraitant.findUnique({
      where: { id },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
          }
        },
        soustraitant: {
          select: {
            id: true,
            nom: true,
          }
        }
      }
    })

    if (!metreActuel) {
      return localizedJson({ error: 'Métré non trouvé' }, { status: 404 })
    }

    // Préparer les données de mise à jour
    const updateData: { statut?: string; chantierId?: string } = {}

    // Mise à jour du statut
    if (statut) {
      const statutsValides = ['SOUMIS', 'VALIDE', 'PARTIELLEMENT_VALIDE', 'REJETE', 'BROUILLON']
      if (!statutsValides.includes(statut)) {
        return localizedJson({ error: 'Statut invalide' }, { status: 400 })
      }
      updateData.statut = statut
    }

    // Mise à jour du chantier (si c'est un chantier libre)
    if (chantierId && metreActuel.chantierId.startsWith('CH-LIBRE-')) {
      // Vérifier que le chantier existe
      const chantierExistant = await prisma.chantier.findUnique({
        where: { chantierId }
      })

      if (!chantierExistant) {
        return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 })
      }

      updateData.chantierId = chantierId
    }

    // Mettre à jour le métré
    const metre = await prisma.metreSoustraitant.update({
      where: { id },
      data: updateData,
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            clientNom: true,
          }
        },
        soustraitant: {
          select: {
            id: true,
            nom: true,
            email: true,
          }
        },
        lignes: {
          orderBy: { createdAt: 'asc' }
        },
        commande: {
          select: {
            id: true,
            reference: true,
          }
        }
      }
    })

    // Envoyer une notification si le statut a changé
    if (statut && statut !== metreActuel.statut) {
      if (statut === 'VALIDE') {
        await notifier({
          code: 'METRE_VALIDE',
          destinataires: [],
          metadata: {
            chantierId: metre.chantierId,
            chantierNom: metre.chantier.nomChantier,
            soustraitantId: metre.soustraitantId,
            soustraitantNom: metre.soustraitant.nom,
            metreId: metre.id,
            userName: session.user.name || 'Un administrateur',
          },
        })
      } else if (statut === 'REJETE') {
        await notifier({
          code: 'METRE_REJETE',
          destinataires: [],
          metadata: {
            chantierId: metre.chantierId,
            chantierNom: metre.chantier.nomChantier,
            soustraitantId: metre.soustraitantId,
            soustraitantNom: metre.soustraitant.nom,
            metreId: metre.id,
          },
        })
      }
    }

    return localizedJson(metre)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du métré:', error)
    return localizedJson(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

