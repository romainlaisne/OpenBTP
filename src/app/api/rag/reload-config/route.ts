import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST() {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || session.user.role !== 'ADMIN') {
    return localizedJson({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    console.log('🔄 Rechargement de la configuration Ollama...');
    
    // Forcer le rechargement du client Ollama
    const { resetOllamaClient } = await import('@/lib/ollama/client');
    resetOllamaClient();
    
    console.log('✅ Configuration Ollama rechargée');
    
    return localizedJson({
      success: true,
      message: 'Configuration Ollama rechargée avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors du rechargement de la configuration:', error);
    return localizedJson(
      { error: 'Erreur lors du rechargement de la configuration' },
      { status: 500 }
    );
  }
}

