import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 });
    }

    const url = new URL(request.url)
    const activeOnly = url.searchParams.get('activeOnly') === '1'

    let soustraitants: Array<{ id: string; nom: string }>

    try {
      // Utiliser Prisma pour une requête sécurisée
      const whereClause = activeOnly ? { actif: true } : {}
      
      soustraitants = await prisma.soustraitant.findMany({
        where: whereClause,
        select: { 
          id: true, 
          nom: true 
        },
        orderBy: { nom: 'asc' }
      })
    } catch (error) {
      console.error('Erreur lors de la récupération des sous-traitants:', error);
      return localizedJson(
        { error: 'Erreur lors de la récupération des sous-traitants' },
        { status: 500 }
      );
    }

    // Formater les données pour react-select
    const options = soustraitants.map(st => ({ value: st.id, label: st.nom }));

    return localizedJson(options);
  } catch (error) {
    console.error('Erreur:', error);
    return localizedJson(
      { error: 'Erreur lors de la récupération des sous-traitants' },
      { status: 500 }
    );
  }
} 