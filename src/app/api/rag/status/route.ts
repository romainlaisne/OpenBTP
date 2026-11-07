import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
// API pour vérifier le statut de l'indexation RAG
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { vectorStore } from '@/lib/rag/vector-store';

export async function GET(_request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 });
    }

    // Compter les documents indexés par type
    const allDocs = await vectorStore.getAllDocuments();
    
    const stats = allDocs.reduce((acc, doc) => {
      const type = doc.metadata.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalDocuments = allDocs.length;

    return localizedJson({
      totalDocuments,
      stats,
      isIndexed: totalDocuments > 0,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification du statut RAG:', error);
    return localizedJson(
      { error: 'Erreur lors de la vérification du statut' },
      { status: 500 }
    );
  }
}
