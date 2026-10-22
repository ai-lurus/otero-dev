import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { getTenantSession, tenantOwnsBlob } from '@/lib/obligation-access'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const ctx = await getTenantSession()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const pathname = searchParams.get('pathname')
  if (!pathname) return NextResponse.json({ error: 'Missing pathname' }, { status: 400 })
  if (!(await tenantOwnsBlob(ctx.tenantId, pathname))) return new NextResponse('Not found', { status: 404 })

  const result = await get(pathname, { access: 'private' })
  if (!result || result.statusCode !== 200) return new NextResponse('Not found', { status: 404 })

  const download = searchParams.get('download') === '1'
  const filename = encodeURIComponent(pathname.split('/').pop()?.replace(/^[0-9a-f-]{36}-/, '') ?? 'archivo')
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
