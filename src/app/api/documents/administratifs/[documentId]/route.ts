import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { unlink } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function DELETE(request: Request, { params }: { params: Promise<{ documentId: string }> }) {
  await bindRequestLocale()
  try {
    const { documentId } = await params
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return localizedJson({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const documentIdNum = parseInt(documentId, 10)
    if (isNaN(documentIdNum)) {
      return localizedJson({ error: 'ID de document invalide' }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: { 
        id: documentIdNum,
        chantierId: null
      },
    })

    if (!document) {
      return localizedJson({ error: 'Document non trouvé' }, { status: 404 })
    }

    const filePath = path.join(process.cwd(), 'public', document.url);
    
    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
      } else {
        console.warn(`Fichier non trouvé pour suppression : ${filePath} (document ID: ${documentIdNum})`);
      }
    } catch (fileError) {
      console.error(`Erreur lors de la suppression du fichier ${filePath}:`, fileError);
    }

    await prisma.document.delete({
      where: { id: documentIdNum },
    })

    return localizedJson({ message: 'Document et son entrée supprimés avec succès' })
  } catch (error: unknown) {
    console.error('Erreur lors de la suppression du document administratif:', error)
    
    // Log détaillé de l'erreur
    if (typeof error === 'object' && error) {
      console.error('Type d\'erreur:', error.constructor.name)
      console.error('Détails:', JSON.stringify(error, null, 2))
    }
    
    if (typeof error === 'object' && error && 'code' in error && (error as { code?: string }).code === 'P2025') {
      return localizedJson({ error: 'Document non trouvé en base de données' }, { status: 404 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return localizedJson({ 
      error: 'Erreur serveur lors de la suppression du document',
      details: errorMessage
    }, { status: 500 })
  }
} 