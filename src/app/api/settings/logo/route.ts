import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile } from 'fs/promises'
import path from 'path'
import { validateImageFile } from '@/lib/utils/image-validation'

export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return localizedJson(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return localizedJson({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const validation = await validateImageFile(file)
    if (!validation.isValid) {
      return localizedJson({ error: 'Fichier invalide : seules les images sont acceptées.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Créer le dossier public/images s'il n'existe pas
    const imagesDir = path.join(process.cwd(), 'public', 'images')
    await writeFile(path.join(imagesDir, 'logo.png'), buffer)

    // Retourner l'URL du logo
    return localizedJson({ url: '/images/logo.png' })
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error)
    return localizedJson(
      { error: 'Erreur lors de l\'upload du logo' },
      { status: 500 }
    )
  }
} 