import { del, get } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { getTenantSession } from '@/lib/obligation-access'
import { ALLOWED_UPLOAD_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/upload-rules'
import { documentBlobPrefix } from '@/lib/documents/blob-path'
import { addDocument, getAnalysisRoom } from '@/app/actions/documents'
import { analyzeDocument } from '@/lib/documents/analyze'

export const runtime = 'nodejs'
export const maxDuration = 60

// Registra un documento que el navegador ya subió a Blob (ver /api/upload/token):
// valida el archivo, lo lee con Haiku y lo guarda en la base. Solo viaja JSON, no el archivo.
export async function POST(request: NextRequest) {
  // El tenant siempre sale de la sesión, nunca del cuerpo.
  const ctx = await getTenantSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const pathname = typeof body.pathname === 'string' ? body.pathname : ''
    const name = typeof body.name === 'string' ? body.name.slice(0, 255) : ''
    const category = (typeof body.category === 'string' && body.category.trim()) || 'General'
    const service = (typeof body.service === 'string' && body.service.trim().slice(0, 120)) || undefined
    const requiresSig = body.requiresSignature === true

    if (!name || !pathname.startsWith(documentBlobPrefix(ctx.tenantId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const blob = await get(pathname, { access: 'private' })
    if (!blob || blob.statusCode !== 200) {
      return NextResponse.json({ error: 'El archivo no llegó completo. Intenta de nuevo.' }, { status: 404 })
    }
    const mime = blob.blob.contentType
    const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer())
    if (bytes.length === 0 || bytes.length > MAX_DOCUMENT_BYTES) {
      await del(pathname).catch(() => {})
      return NextResponse.json({ error: 'El archivo debe pesar menos de 50 MB' }, { status: 413 })
    }
    if (!ALLOWED_UPLOAD_TYPES.has(mime)) {
      await del(pathname).catch(() => {})
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 })
    }

    const ext = name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const size = bytes.length < 1024 * 1024
      ? `${(bytes.length / 1024).toFixed(0)} KB`
      : `${(bytes.length / (1024 * 1024)).toFixed(1)} MB`

    // Tope diario por empresa para acotar el costo: pasado el tope se guarda sin análisis.
    // Si Haiku falla o el formato no se analiza, el archivo se guarda igual y el cliente lo llena a mano.
    const analysisSkipped = (await getAnalysisRoom(ctx.tenantId)) <= 0
    const analysis = analysisSkipped ? null : await analyzeDocument(bytes, mime, name)

    const docId = await addDocument({
      tenantId: ctx.tenantId,
      name,
      type: ext,
      category,
      service,
      status: 'vigente',
      size,
      requiresSignature: requiresSig,
      blobUrl: blob.blob.url,
      blobPathname: pathname,
      analysis,
    })

    return NextResponse.json({ success: true, docId, pathname, size, analysis, analysisSkipped })
  } catch (error) {
    console.error('[upload] error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
