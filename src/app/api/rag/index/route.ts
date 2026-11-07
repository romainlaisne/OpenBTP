import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
// API pour indexer les données RAG
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ragService } from '@/lib/rag/rag-service';
import { vectorStore } from '@/lib/rag/vector-store';

export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    console.log('📚 Action d\'indexation RAG:', { action, userId: session.user.id });

    switch (action) {
      case 'index-all':
        await ragService.indexAllData();
        return localizedJson({ 
          message: 'Indexation complète terminée avec succès',
          action: 'index-all'
        });

      case 'clear':
        await vectorStore.clearStore();
        return localizedJson({ 
          message: 'Vector store vidé avec succès',
          action: 'clear'
        });

      case 'stats':
        const stats = await vectorStore.getStats();
        return localizedJson({ 
          stats,
          action: 'stats'
        });

      default:
        return localizedJson({ error: 'Action non reconnue' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Erreur API RAG index:', error);
    return localizedJson(
      { error: 'Erreur lors de l\'indexation' },
      { status: 500 }
    );
  }
}



