import { get } from '@vercel/blob'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/app/actions/auth-helpers'
import { db } from '@/lib/db'
import { ingestSources } from '@/lib/db/schema'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const [row] = await db.select().from(ingestSources).where(eq(ingestSources.id, id)).limit(1)
  if (!row?.blobPathname) return new NextResponse('Not found', { status: 404 })

  const result = await get(row.blobPathname, { access: 'private' })
  if (!result || result.statusCode !== 200) return new NextResponse('Not found', { status: 404 })

  const download = searchParams.get('download') === '1'
  const filename = encodeURIComponent(row.fileName ?? 'archivo')
  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType ?? 'application/octet-stream',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${filename}`,
      'X-Content-Type-Options': 'nosniff',
      ETag: result.blob.etag,
      'Cache-Control': 'private, no-cache',
    },
  })
}
