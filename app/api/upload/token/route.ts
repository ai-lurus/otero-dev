import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { type NextRequest, NextResponse } from 'next/server'
import { getTenantSession } from '@/lib/obligation-access'
import { ALLOWED_UPLOAD_TYPES, MAX_DOCUMENT_BYTES } from '@/lib/upload-rules'
import { documentBlobPrefix } from '@/lib/documents/blob-path'

export const runtime = 'nodejs'

// Emite el permiso para que el navegador suba un documento directo a Blob.
// El archivo no pasa por una función, así que no aplica el tope de ~4.5 MB del cuerpo.
export async function POST(request: NextRequest) {
  const ctx = await getTenantSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await request.json()) as HandleUploadBody
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async pathname => {
        // El archivo solo puede ir a la carpeta de la empresa de quien lo sube.
        if (!pathname.startsWith(documentBlobPrefix(ctx.tenantId))) throw new Error('Forbidden')
        return {
          allowedContentTypes: [...ALLOWED_UPLOAD_TYPES],
          maximumSizeInBytes: MAX_DOCUMENT_BYTES,
          addRandomSuffix: false,
          allowOverwrite: false,
        }
      },
    })
    return NextResponse.json(json)
  } catch (error) {
    console.error('[upload/token] error:', error)
    return NextResponse.json({ error: 'No se pudo preparar la subida' }, { status: 400 })
  }
}
