import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 });
    }

    const companySettings = await prisma.companysettings.findUnique({
      where: { id: 'COMPANY_SETTINGS' },
    });

    if (!companySettings) {
      return localizedJson({ error: 'Paramètres de l\'entreprise non trouvés' }, { status: 404 });
    }

    // Retourner uniquement les champs nécessaires, par exemple le nom
    return localizedJson({ name: companySettings.name, email: companySettings.email, emailFrom: companySettings.emailFrom, emailUser: companySettings.emailUser });

  } catch (error: unknown) {
    console.error('Erreur API get company settings:', error);
    return localizedJson({ error: (error as Error).message || 'Erreur serveur interne' }, { status: 500 });
  }
} 