import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CODES_SOCIETE } from '@/lib/documents/types'
import { enregistrerDocumentSociete } from '@/lib/documents/stockage'

const EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'webp']

// GET : documents de la société — en vigueur et historique archivé
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  const session = await getServerSession(authOptions)
  if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await props.params
  const st = await prisma.soustraitant.findUnique({ where: { id }, select: { id: true, nom: true, tva: true } })
  if (!st) return localizedJson({ error: 'Sous-traitant non trouvé' }, { status: 404 })
  const documents = await prisma.documentSousTraitant.findMany({
    where: { soustraitantId: id },
    orderBy: [{ archive: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, type: true, nom: true, url: true, dateExpiration: true, precision: true, archive: true, archiveLe: true, createdAt: true },
  })
  return localizedJson({ soustraitant: st, documents })
}

// POST (multipart) : file, type, dateExpiration?, precision? — archive le document en vigueur du même type (types uniques)
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions)
    if (!session) return localizedJson({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = String(formData.get('type') || '')
    const dateExpiration = String(formData.get('dateExpiration') || '')
    const precision = String(formData.get('precision') || '')

    if (!file || !type) return localizedJson({ error: 'Le fichier et le type sont requis' }, { status: 400 })
    if (!CODES_SOCIETE.includes(type)) return localizedJson({ error: 'Type de document non valide' }, { status: 400 })
    const extension = (file.name.split('.').pop() || '').toLowerCase()
    if (!EXTENSIONS.includes(extension)) {
      return localizedJson({ error: `Format non accepté (.${extension}). Formats : ${EXTENSIONS.join(', ')}.` }, { status: 400 })
    }

    const document = await enregistrerDocumentSociete(id, {
      type,
      contenu: Buffer.from(await file.arrayBuffer()),
      extension: extension === 'jpeg' ? 'jpg' : extension,
      nomOriginal: file.name,
      dateExpiration: /^\d{4}-\d{2}-\d{2}$/.test(dateExpiration) ? new Date(`${dateExpiration}T00:00:00.000Z`) : null,
      precision: precision.trim().slice(0, 60) || null,
    })
    return localizedJson(document)
  } catch (error) {
    console.error('Erreur:', error)
    return localizedJson({ error: "Erreur lors de l'envoi du document" }, { status: 500 })
  }
}
