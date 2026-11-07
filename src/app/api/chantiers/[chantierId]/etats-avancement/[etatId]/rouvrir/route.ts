import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/chantiers/[chantierId]/etats-avancement/[etatId]/rouvrir
export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string }> }
) {
  await bindRequestLocale()
  const params = await props.params;
  const chantierReadableId = params.chantierId;
  const etatNumero = parseInt(params.etatId);

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le chantier par son ID lisible pour obtenir le CUID
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId }
    });

    if (!chantier) {
      return localizedJson({ error: 'Chantier non trouvé' }, { status: 404 });
    }

    // Vérifier que l'état d'avancement existe et appartient au chantier
    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantier.id,
        numero: etatNumero
      },
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    })

    if (!etatAvancement) {
      return localizedJson(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    if (!etatAvancement.estFinalise) {
      return localizedJson(
        { error: 'L\'état d\'avancement n\'est pas finalisé' },
        { status: 400 }
      )
    }

    // Vérifier qu'il n'y a pas d'état suivant
    const etatSuivant = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantier.id,
        numero: etatAvancement.numero + 1
      }
    })

    if (etatSuivant) {
      return localizedJson(
        { error: 'Impossible de réouvrir un état qui a un état suivant' },
        { status: 400 }
      )
    }

    // Réouvrir l'état
    const updatedEtat = await prisma.etatAvancement.update({
      where: {
        id: etatAvancement.id
      },
      data: {
        estFinalise: false
      },
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    })

    return localizedJson(updatedEtat)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la réouverture de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}
