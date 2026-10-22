import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getTenantSession, tenantOwnsItem } from '@/lib/obligation-access'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, safeFileName } from '@/lib/upload-rules'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const ctx = await getTenantSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  const itemId = formData.get('itemId')
  if (!(file instanceof File) || typeof itemId !== 'string') {
    return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
  }
  if (!(await tenantOwnsItem(ctx.tenantId, itemId))) {
    return NextResponse.json({ error: 'Asunto no encontrado' }, { status: 404 })
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'El archivo debe pesar menos de 25 MB' }, { status: 413 })
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 })
  }

  const blob = await put(`obligations/${ctx.tenantId}/${itemId}/${crypto.randomUUID()}-${safeFileName(file.name)}`, file, {
    access: 'private',
    addRandomSuffix: false,
    contentType: file.type,
  })
  return NextResponse.json({ pathname: blob.pathname, name: file.name, size: file.size, type: file.type })
}
