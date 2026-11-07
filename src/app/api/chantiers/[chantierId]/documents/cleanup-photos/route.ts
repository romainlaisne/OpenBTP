import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// POST: Supprimer toutes les photos (documents de type photo-chantier) d'un chantier
export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string }> }
) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    }

    const params = await props.params

    // Récupérer tous les documents de type photo-chantier pour ce chantier
    const photos = await prisma.document.findMany({
      where: {
        chantierId: params.chantierId,
        type: 'photo-chantier',
      },
      select: {
        id: true,
        url: true,
      },
    })

    console.log(`🗑️ Suppression de ${photos.length} photos...`)

    // Supprimer les fichiers physiques
    for (const photo of photos) {
      try {
        if (photo.url.startsWith('/uploads/')) {
          const filePath = join(process.cwd(), 'public', photo.url)
          if (existsSync(filePath)) {
            await unlink(filePath)
            console.log(`✅ Fichier supprimé: ${filePath}`)
          }
        }
      } catch (error) {
        console.error(`⚠️ Erreur lors de la suppression du fichier ${photo.url}:`, error)
        // Continuer même si le fichier n'existe pas
      }
    }

    // Supprimer les documents de la base de données (les tags seront supprimés automatiquement par cascade)
    const result = await prisma.document.deleteMany({
      where: {
        chantierId: params.chantierId,
        type: 'photo-chantier',
      },
    })

    console.log(`✅ ${result.count} photos supprimées de la base de données`)

    return localizedJson({
      success: true,
      deleted: result.count,
      message: `${result.count} photos supprimées`,
    })
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des photos:', error)
    return localizedJson(
      { error: 'Erreur lors de la suppression des photos' },
      { status: 500 }
    )
  }
}

