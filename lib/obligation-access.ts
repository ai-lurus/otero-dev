import { and, eq, isNotNull } from 'drizzle-orm'
import { getTenantDb } from '@/lib/db/tenant'
import { documents, regulatoryItems, regulatoryItemEvidence } from '@/lib/db/schema'
import { getAccess } from '@/lib/access'
import { can } from '@/lib/client-permissions'
import { memberIdOf } from '@/lib/regulatory-items-db'
import { canSeeItem } from '@/lib/client-access'

export async function getTenantSession() {
  const access = await getAccess()
  if (!access) return null
  const memberId = await memberIdOf(access.tenantId, access.userId)
  // Con permiso de ver RegWatch la persona ve todos los asuntos enviados, como el director; si no, solo lo asignado.
  const seesAll = can(access, 'regwatch', 'view')
  return { ...access, memberId, seesAll }
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
  return Boolean(row) && canSeeItem({ isDirector: ctx.seesAll, memberId: ctx.memberId }, row)
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

/** Documento de la empresa por su ruta en Blob, para registrar descargas con su nombre. */
export async function findOwnDocument(tenantId: string, pathname: string) {
  const db = await getTenantDb(tenantId)
  const [row] = await db
    .select({ id: documents.id, name: documents.name })
    .from(documents)
    .where(and(eq(documents.blobPathname, pathname), eq(documents.tenantId, tenantId)))
    .limit(1)
  return row ?? null
}

/** Evidencia de un asunto por su ruta en Blob: asunto y título, para la bitácora. */
export async function findEvidenceByBlob(tenantId: string, pathname: string) {
  const db = await getTenantDb(tenantId)
  const [row] = await db
    .select({ itemId: regulatoryItemEvidence.itemId, title: regulatoryItemEvidence.title })
    .from(regulatoryItemEvidence)
    .where(and(eq(regulatoryItemEvidence.blobPathname, pathname), eq(regulatoryItemEvidence.tenantId, tenantId)))
    .limit(1)
  return row ?? null
}
