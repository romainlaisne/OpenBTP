import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';

// GET - Récupérer tous les ouvriers internes actifs
export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 });
    }

    const ouvriers = await prisma.ouvrierInterne.findMany({
      where: {
        actif: true
      },
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' }
      ]
    });

    return localizedJson(ouvriers);

  } catch (error) {
    console.error('Erreur lors de la récupération des ouvriers internes:', error);
    return localizedJson(
      { error: 'Erreur lors de la récupération des ouvriers internes' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouvel ouvrier interne
export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await request.json();
    const { nom, prenom, email, telephone, poste } = data;

    if (!nom || !prenom) {
      return localizedJson(
        { error: 'Le nom et prénom sont requis' },
        { status: 400 }
      );
    }

    const nouvelOuvrier = await prisma.ouvrierInterne.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        poste,
        actif: true
      }
    });

    return localizedJson(nouvelOuvrier, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création de l\'ouvrier interne:', error);
    return localizedJson(
      { error: 'Erreur lors de la création de l\'ouvrier interne' },
      { status: 500 }
    );
  }
}


