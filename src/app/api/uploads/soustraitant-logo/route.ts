import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
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
    const soustraitantId = formData.get('soustraitantId') as string

    if (!file) {
      return localizedJson({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (!soustraitantId) {
      return localizedJson({ error: 'ID sous-traitant requis' }, { status: 400 })
    }

    const validation = await validateImageFile(file)
    if (!validation.isValid) {
      return localizedJson({ error: 'Fichier invalide : seules les images sont acceptées.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Créer le dossier pour ce sous-traitant s'il n'existe pas
    const soustraitantDir = path.join(process.cwd(), 'public', 'uploads', 'soustraitants', soustraitantId)
    await mkdir(soustraitantDir, { recursive: true })

    // Sauvegarder le logo avec un nom fixe
    const logoPath = path.join(soustraitantDir, 'logo.png')
    await writeFile(logoPath, buffer)

    // Retourner l'URL relative du logo
    const logoUrl = `/uploads/soustraitants/${soustraitantId}/logo.png`
    return localizedJson({ url: logoUrl })
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo sous-traitant:', error)
    return localizedJson(
      { error: 'Erreur lors de l\'upload du logo' },
      { status: 500 }
    )
  }
}

