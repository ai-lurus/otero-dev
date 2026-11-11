import { del, head } from '@vercel/blob'
import { after, type NextRequest, NextResponse } from 'next/server'
import { getTenantSession } from '@/lib/obligation-access'
import { ALLOWED_UPLOAD_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/upload-rules'
import { documentBlobPrefix } from '@/lib/documents/blob-path'
import { addDocument, getAnalysisRoom } from '@/app/actions/documents'
import { analyzeStoredDocument } from '@/lib/documents/run-analysis'

export const runtime = 'nodejs'
export const maxDuration = 120 // un documento largo se lee por partes (ver lib/documents/analyze.ts)

// Registra un documento que el navegador ya subió a Blob (ver /api/upload/token):
// valida el archivo y lo guarda en la base; Haiku lo lee después, en segundo plano, directo del Blob.
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

    // Solo metadatos: el archivo no se descarga aquí, la lectura corre en segundo plano.
    const meta = await head(pathname).catch(() => null)
    if (!meta) {
      return NextResponse.json({ error: 'El archivo no llegó completo. Intenta de nuevo.' }, { status: 404 })
    }
    if (meta.size === 0 || meta.size > MAX_DOCUMENT_BYTES) {
      await del(pathname).catch(() => {})
      return NextResponse.json({ error: 'El archivo debe pesar menos de 50 MB' }, { status: 413 })
    }
    if (!ALLOWED_UPLOAD_TYPES.has(meta.contentType)) {
      await del(pathname).catch(() => {})
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 })
    }

    const ext = name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const size = meta.size < 1024 * 1024
      ? `${(meta.size / 1024).toFixed(0)} KB`
      : `${(meta.size / (1024 * 1024)).toFixed(1)} MB`

    // Tope diario por empresa para acotar el costo: pasado el tope se guarda sin lectura de Otero.
    const analysisSkipped = (await getAnalysisRoom(ctx.tenantId)) <= 0
    const analysisStatus = analysisSkipped ? 'none' : 'analyzing'

    const docId = await addDocument({
      tenantId: ctx.tenantId,
      name,
      type: ext,
      category,
      service,
      status: 'vigente',
      size,
      requiresSignature: requiresSig,
      blobUrl: meta.url,
      blobPathname: pathname,
      analysisStatus,
    })

    // Haiku lee el documento completo por partes después de responder: la subida no espera.
    if (!analysisSkipped) after(() => analyzeStoredDocument(ctx.tenantId, docId))

    return NextResponse.json({ success: true, docId, pathname, size, analysisStatus, analysisSkipped })
  } catch (error) {
    console.error('[upload] error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
