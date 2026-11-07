import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prismaWithExtensions } from '@/lib/prisma/types'

export async function DELETE(request: Request, props: { params: Promise<{ rackId: string }> }) {
  await bindRequestLocale()
  const params = await props.params;
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier les droits d'administration
    if (session.user.role !== 'ADMIN') {
      return localizedJson(
        { error: 'Autorisation insuffisante - seuls les administrateurs peuvent supprimer des racks' },
        { status: 403 }
      )
    }

    const rackId = params.rackId
    
    if (!rackId) {
      return localizedJson({ error: 'ID de rack requis' }, { status: 400 })
    }
    
    // Vérifier que le rack existe
    const rack = await prismaWithExtensions.rack.findUnique({
      where: { id: rackId },
      include: {
        emplacements: {
          include: {
            materiaux: true
          }
        }
      }
    })
    
    if (!rack) {
      return localizedJson({ error: 'Rack non trouvé' }, { status: 404 })
    }
    
    // Vérifier que le rack est vide (aucun matériau dans ses emplacements)
    const hasMateriaux = rack.emplacements.some(emplacement => emplacement.materiaux.length > 0)
    
    if (hasMateriaux) {
      return localizedJson({ 
        error: 'Impossible de supprimer un rack qui contient des matériaux. Veuillez d\'abord vider tous les emplacements.' 
      }, { status: 400 })
    }
    
    // Supprimer d'abord tous les emplacements du rack
    await prismaWithExtensions.emplacement.deleteMany({
      where: { rackId: rackId }
    })
    
    // Puis supprimer le rack
    await prismaWithExtensions.rack.delete({
      where: { id: rackId }
    })
    
    return localizedJson({ 
      message: 'Rack supprimé avec succès',
      deletedRack: {
        id: rack.id,
        nom: rack.nom,
        emplacementsSupprimes: rack.emplacements.length
      }
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du rack:', error)
    return localizedJson({ 
      error: 'Erreur lors de la suppression du rack' 
    }, { status: 500 })
  }
}
