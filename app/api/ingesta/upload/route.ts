import { put } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/app/actions/auth-helpers'
import { db } from '@/lib/db'
import { ingestSources, user } from '@/lib/db/schema'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, safeFileName } from '@/lib/upload-rules'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let userId: string
  try {
    userId = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  // Stores nuevos de Vercel usan OIDC (BLOB_STORE_ID); los antiguos, token fijo.
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json({ error: 'El almacenamiento de archivos aún no está configurado' }, { status: 503 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'El archivo debe pesar menos de 25 MB' }, { status: 413 })
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 })
  }

  const id = `src-${crypto.randomUUID()}`
  const blob = await put(`ingesta/${id}/${safeFileName(file.name)}`, file, {
    access: 'private',
    addRandomSuffix: false,
    contentType: file.type,
  })
  const [row] = await db.insert(ingestSources).values({
    id,
    kind: 'file',
    title: file.name.slice(0, 200),
    blobPathname: blob.pathname,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    createdBy: userId,
  }).returning()
  const [me] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1)
  return NextResponse.json({ source: { ...row, createdByName: me?.name ?? null } })
}
