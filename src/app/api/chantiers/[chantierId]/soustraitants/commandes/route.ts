import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  await bindRequestLocale()
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // 1. Récupérer l'ID interne du chantier à partir de son ID lisible
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId: chantierId }, // Utilise le chantierId des params
      select: { id: true }
    });

    if (!chantierData) {
      return localizedJson({ error: 'Chantier non trouvé pour cet ID lisible' }, { status: 404 });
    }
    const chantierIdInterne = chantierData.id;

    // Récupérer toutes les commandes sous-traitant pour ce chantier en utilisant Prisma ORM
    const commandesFromDb = await prisma.commandeSousTraitant.findMany({
      where: {
        chantierId: chantierIdInterne,
      },
      include: {
        soustraitant: { // Assumant que la relation dans le modèle Prisma est nommée 'soustraitant'
          select: {
            nom: true,
            email: true,
          }
        }
      },
      orderBy: {
        dateCommande: 'asc',
      }
    });

    // Transformer les données pour correspondre à la structure attendue (avec soustraitantNom, soustraitantEmail)
    const commandes = commandesFromDb.map(cmd => {
      const { soustraitant, ...restOfCmd } = cmd;
      return {
        ...restOfCmd,
        soustraitantNom: soustraitant?.nom,
        soustraitantEmail: soustraitant?.email,
      };
    });

    return localizedJson(commandes)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson(
      { error: 'Erreur lors de la récupération des commandes sous-traitant' },
      { status: 500 }
    )
  }
} 