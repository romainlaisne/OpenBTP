import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/messaging/messages/read - Marquer les messages comme lus
export async function POST(req: NextRequest) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { chatId } = await req.json();
    
    if (!chatId) {
      return localizedJson({ error: 'ID de chat requis' }, { status: 400 });
    }
    
    // Vérifier que l'utilisateur est participant de la conversation
    const isParticipant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });
    
    if (!isParticipant) {
      return localizedJson({ error: 'Non autorisé pour ce chat' }, { status: 403 });
    }
    
    // Marquer tous les messages non lus comme lus
    const result = await prisma.chatMessage.updateMany({
      where: {
        chatId,
        senderId: {
          not: userId, // Seulement les messages des autres
        },
        read: false,
      },
      data: {
        read: true,
      },
    });
    
    // Mettre à jour lastReadAt pour l'utilisateur
    await prisma.chatParticipant.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });
    
    return localizedJson({ 
      success: true, 
      count: result.count,
    });
  } catch (error) {
    console.error('Erreur lors du marquage des messages:', error);
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 });
  }
} 