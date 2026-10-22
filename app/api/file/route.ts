import { get } from '@vercel/blob'
import { type NextRequest, NextResponse } from 'next/server'
import { getTenantSession, tenantOwnsDocument } from '@/lib/obligation-access'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const ctx = await getTenantSession()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const pathname = request.nextUrl.searchParams.get('pathname')
    if (!pathname) {
      return NextResponse.json({ error: 'Missing pathname' }, { status: 400 })
    }
    // Only serve blobs registered as documents of the caller's own tenant.
    if (!(await tenantOwnsDocument(ctx.tenantId, pathname))) {
      return new NextResponse('Not found', { status: 404 })
    }

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })

    if (!result) {
      return new NextResponse('Not found', { status: 404 })
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          'Cache-Control': 'private, no-cache',
        },
      })
    }

    // Force download with the original filename
    const filename = pathname.split('/').pop() ?? 'document'
    const cleanName = encodeURIComponent(filename.replace(/^\d+-/, '')) // strip timestamp prefix

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type':        result.blob.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${cleanName}`,
        'X-Content-Type-Options': 'nosniff',
        ETag:                  result.blob.etag,
        'Cache-Control':       'private, no-cache',
      },
    })
  } catch (error) {
    console.error('[file] error:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
