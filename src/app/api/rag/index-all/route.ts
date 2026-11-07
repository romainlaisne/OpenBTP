import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
// API pour indexer toute la base de données
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ragService } from '@/lib/rag/rag-service';

export async function POST(_request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return localizedJson({ error: 'Accès refusé - Admin requis' }, { status: 403 });
    }

    console.log('🔄 Début de l\'indexation complète par:', session.user.email);

    // Lancer l'indexation complète
    await ragService.indexAllData();

    console.log('✅ Indexation complète terminée');

    return localizedJson({ 
      success: true, 
      message: 'Indexation complète de la base de données terminée avec succès' 
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'indexation complète:', error);
    return localizedJson(
      { error: 'Erreur lors de l\'indexation complète' },
      { status: 500 }
    );
  }
}
