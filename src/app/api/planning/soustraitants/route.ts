import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';

// GET - Récupérer tous les sous-traitants actifs
export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 });
    }

    const soustraitants = await prisma.soustraitant.findMany({
      where: {
        actif: true
      },
      orderBy: {
        nom: 'asc'
      }
    });

    return localizedJson(soustraitants);

  } catch (error) {
    console.error('Erreur lors de la récupération des sous-traitants:', error);
    return localizedJson(
      { error: 'Erreur lors de la récupération des sous-traitants' },
      { status: 500 }
    );
  }
}


