import { put } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { getTenantSession } from '@/lib/obligation-access'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, safeFileName } from '@/lib/upload-rules'
import { addDocument } from '@/app/actions/documents'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  // Auth check: the tenant always comes from the session, never from the form.
  const ctx = await getTenantSession()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file        = formData.get('file')
    const tenantId    = formData.get('tenantId')
    const category    = (formData.get('category') as string) || 'General'
    const service     = (formData.get('service') as string) || undefined
    const requiresSig = formData.get('requiresSignature') === 'true'
    const expiresAt   = (formData.get('expiresAt') as string) || undefined

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
    }
    if (tenantId && tenantId !== ctx.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'El archivo debe pesar menos de 25 MB' }, { status: 413 })
    }
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 })
    }

    // Derive type from extension
    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const size = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`

    // Upload to Vercel Blob (private store)
    const blob = await put(`documents/${ctx.tenantId}/${Date.now()}-${safeFileName(file.name)}`, file, {
      access: 'private',
      contentType: file.type,
    })

    // Persist record in Neon
    const docId = await addDocument({
      tenantId:         ctx.tenantId,
      name:             file.name,
      type:             ext,
      category,
      service:          service || undefined,
      status:           'vigente',
      size,
      expiresAt,
      requiresSignature: requiresSig,
      blobUrl:          blob.url,
      blobPathname:     blob.pathname,
    })

    return NextResponse.json({ success: true, docId, pathname: blob.pathname })
  } catch (error) {
    console.error('[upload] error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
