import { and, eq, isNotNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { getTenantDb } from '@/lib/db/tenant'
import { documents, regulatoryItems, regulatoryItemEvidence } from '@/lib/db/schema'
import { getFirstTenantId } from '@/app/actions/auth-helpers'
import { isTenantAdmin } from '@/app/actions/tenant-users'
import { memberIdOf } from '@/lib/regulatory-items-db'
import { canSeeItem } from '@/lib/client-access'

export async function getTenantSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const tenantId = await getFirstTenantId()
  if (!tenantId) return null
  const [isDirector, memberId] = await Promise.all([isTenantAdmin(), memberIdOf(tenantId, session.user.id)])
  return { userId: session.user.id, tenantId, isDirector, memberId }
}

type TenantSession = NonNullable<Awaited<ReturnType<typeof getTenantSession>>>

/** El asunto es de la empresa, ya se envió y esta persona puede verlo (el miembro, solo lo suyo). */
export async function tenantOwnsItem(ctx: TenantSession, itemId: string) {
  const db = await getTenantDb(ctx.tenantId)
  const [row] = await db
    .select({ assigneeId: regulatoryItems.assigneeId, status: regulatoryItems.status })
    .from(regulatoryItems)
    .where(and(eq(regulatoryItems.id, itemId), eq(regulatoryItems.tenantId, ctx.tenantId), isNotNull(regulatoryItems.sentAt)))
    .limit(1)
  return Boolean(row) && canSeeItem(ctx, row)
}

/** El archivo es evidencia de un asunto que esta persona puede ver. */
export async function tenantOwnsBlob(ctx: TenantSession, pathname: string) {
  const db = await getTenantDb(ctx.tenantId)
  const [row] = await db
    .select({ itemId: regulatoryItemEvidence.itemId })
    .from(regulatoryItemEvidence)
    .where(and(eq(regulatoryItemEvidence.blobPathname, pathname), eq(regulatoryItemEvidence.tenantId, ctx.tenantId)))
    .limit(1)
  return Boolean(row) && tenantOwnsItem(ctx, row.itemId)
}

export async function tenantOwnsDocument(tenantId: string, pathname: string) {
  const db = await getTenantDb(tenantId)
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.blobPathname, pathname), eq(documents.tenantId, tenantId)))
    .limit(1)
  return rows.length > 0
}
