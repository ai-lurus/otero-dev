import { and, eq, isNotNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { documents, regulatoryItems, regulatoryItemEvidence } from '@/lib/db/schema'
import { getFirstTenantId } from '@/app/actions/auth-helpers'

export async function getTenantSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const tenantId = await getFirstTenantId()
  if (!tenantId) return null
  return { userId: session.user.id, tenantId }
}

export async function tenantOwnsItem(tenantId: string, itemId: string) {
  const rows = await db
    .select({ id: regulatoryItems.id })
    .from(regulatoryItems)
    .where(and(eq(regulatoryItems.id, itemId), eq(regulatoryItems.tenantId, tenantId), isNotNull(regulatoryItems.sentAt)))
    .limit(1)
  return rows.length > 0
}

export async function tenantOwnsBlob(tenantId: string, pathname: string) {
  const rows = await db
    .select({ id: regulatoryItemEvidence.id })
    .from(regulatoryItemEvidence)
    .where(and(eq(regulatoryItemEvidence.blobPathname, pathname), eq(regulatoryItemEvidence.tenantId, tenantId)))
    .limit(1)
  return rows.length > 0
}

export async function tenantOwnsDocument(tenantId: string, pathname: string) {
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.blobPathname, pathname), eq(documents.tenantId, tenantId)))
    .limit(1)
  return rows.length > 0
}
