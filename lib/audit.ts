import { desc, eq, and, gte, lte, inArray, type SQL } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLog, type AuditLogRow } from '@/lib/db/schema'
import { actionsOfCategory, isAuditAction, type AuditAction, type AuditCategory } from '@/lib/audit-actions'

// Registro de la bitácora del sistema. Vive en la base principal y se filtra
// siempre por tenantId. Registrar nunca debe romper la acción del usuario:
// si falla, se deja en el log del servidor y la acción sigue.

export type AuditActor = { tenantId: string; userId: string | null; userName: string }

export type AuditEntry = {
  entityType?: string
  entityId?: string
  entityLabel?: string
  /** Asunto al que pertenece la acción, si aplica. */
  itemId?: string
  detail?: string
  metadata?: Record<string, unknown>
}

export async function logAction(actor: AuditActor, action: AuditAction, entry: AuditEntry = {}): Promise<void> {
  try {
    if (!isAuditAction(action)) throw new Error(`Acción de bitácora desconocida: ${action}`)
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      tenantId: actor.tenantId,
      userId: actor.userId,
      userName: actor.userName,
      action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      entityLabel: entry.entityLabel?.slice(0, 300) ?? null,
      itemId: entry.itemId ?? null,
      detail: entry.detail?.slice(0, 1000) ?? '',
      metadata: entry.metadata ?? {},
    })
  } catch (error) {
    console.error('[audit] no se pudo registrar', action, error)
  }
}

export type AuditFilters = {
  category?: AuditCategory
  userId?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

export async function listAuditLog(tenantId: string, filters: AuditFilters = {}): Promise<AuditLogRow[]> {
  const where: SQL[] = [eq(auditLog.tenantId, tenantId)]
  if (filters.category) where.push(inArray(auditLog.action, actionsOfCategory(filters.category)))
  if (filters.userId) where.push(eq(auditLog.userId, filters.userId))
  if (filters.from) where.push(gte(auditLog.createdAt, filters.from))
  if (filters.to) where.push(lte(auditLog.createdAt, filters.to))
  return db
    .select()
    .from(auditLog)
    .where(and(...where))
    .orderBy(desc(auditLog.createdAt))
    .limit(Math.min(filters.limit ?? 100, 200))
    .offset(filters.offset ?? 0)
}
