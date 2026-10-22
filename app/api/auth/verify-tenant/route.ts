import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userTenants } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const userId   = req.nextUrl.searchParams.get('userId')
  const tenantId = req.nextUrl.searchParams.get('tenantId')

  if (!userId || !tenantId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const rows = await db
    .select()
    .from(userTenants)
    .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
    .limit(1)

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not a member of this tenant' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, role: rows[0].role })
}
