import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Removed unused BigInt formatting helper

// Fonction pour formater correctement les dates
function formatDate(date: unknown): string | null {
  if (!date) return null;
  
  try {
    // Si c'est déjà une chaîne formatée, la retourner
    if (typeof date === 'string') {
      // Convertir les dates MySQL en format ISO
      if (date.includes(' ') && !date.includes('T')) {
        return date.replace(' ', 'T');
      }
      return date;
    }
    
    // Si c'est un objet Date, convertir en ISO string
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    // Sinon, ne gérer que number, sinon null
    const d = (typeof date === 'number') ? new Date(date) : new Date(NaN);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch (e) {
    console.error("Erreur lors du formatage de la date:", e, date);
    return null;
  }
}

// GET /api/chantiers/[chantierId]/reception/[id]
// Récupérer une réception spécifique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chantierId: string; id: string }> }
) {
  await bindRequestLocale()
  try {
    const resolvedParams = await params
    const { chantierId, id } = resolvedParams

    console.log(`📥 GET /api/chantiers/${chantierId}/reception/${id}`)

    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Utiliser Prisma au lieu de SQL brut pour plus de sécurité
    const reception = await prisma.receptionChantier.findUnique({
      where: { 
        id
      },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        soustraitantPINs: {
          include: {
            soustraitant: {
              select: {
                id: true,
                nom: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!reception) {
      console.log(`❌ Réception non trouvée: ${id}`)
      return localizedJson(
        { error: 'Réception non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que la réception appartient bien au chantier demandé
    if (reception.chantierId !== chantierId) {
      console.log(`❌ La réception ${id} n'appartient pas au chantier ${chantierId}`)
      return localizedJson(
        { error: 'Réception non trouvée' },
        { status: 404 }
      )
    }

    console.log(`✅ Réception trouvée: ${reception.id}`)

    // Formater la réponse
    const response = {
      id: reception.id,
      chantierId: reception.chantierId,
      dateCreation: formatDate(reception.dateCreation),
      dateLimite: formatDate(reception.dateLimite),
      codePIN: reception.codePIN,
      estFinalise: reception.estFinalise,
      createdBy: reception.user ? {
        id: reception.user.id,
        name: reception.user.name,
        email: reception.user.email
      } : null,
      chantier: {
        chantierId: reception.chantier.chantierId,
        nomChantier: reception.chantier.nomChantier
      },
      soustraitantPINs: reception.soustraitantPINs.map(pin => ({
        id: pin.id,
        codePIN: pin.codePIN,
        estInterne: pin.estInterne,
        soustraitant: pin.soustraitant ? {
          id: pin.soustraitant.id,
          nom: pin.soustraitant.nom,
          email: pin.soustraitant.email
        } : null
      }))
    }

    return localizedJson(response)
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la réception:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    return localizedJson(
      { 
        error: 'Erreur lors de la récupération de la réception',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
} 