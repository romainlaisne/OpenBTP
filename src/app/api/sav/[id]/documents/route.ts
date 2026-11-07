import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import fs from 'fs'
import path from 'path'

// POST /api/sav/[id]/documents (multipart)
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    const form = await request.formData()
    const file = form.get('file') as File | null
    const type = (form.get('type') as string) || 'AUTRE'
    if (!file) return localizedJson({ error: 'Fichier requis' }, { status: 400 })

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'sav')
    await fs.promises.mkdir(uploadsDir, { recursive: true })
    const fileName = `${Date.now()}-${file.name}`
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.promises.writeFile(path.join(uploadsDir, fileName), buffer)
    const url = `/uploads/sav/${fileName}`

    const created = await prisma.documentSAV.create({
      data: {
        ticketSAVId: id,
        nom: file.name,
        nomOriginal: file.name,
        url,
        taille: Number(file.size) || 0,
        mimeType: file.type || 'application/octet-stream',
        type,
        uploadedBy: session.user.id,
      }
    })
    return localizedJson(created, { status: 201 })
  } catch {
    return localizedJson({ error: 'Erreur serveur' }, { status: 500 })
  }
}

