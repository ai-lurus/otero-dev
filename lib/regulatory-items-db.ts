import { and, desc, eq, inArray } from 'drizzle-orm'
import { db as mainDb } from '@/lib/db'
import { getOwnTenantDb, getTenantDb } from '@/lib/db/tenant'
import { regulatoryItemEvents, regulatoryItemEvidence, user, userTenants } from '@/lib/db/schema'
import { members } from '@/lib/db/tenant-schema'

// Piezas compartidas por las acciones de asuntos (bandeja y tablero de cumplimiento).
// No es un archivo 'use server': nada de aquí se expone al navegador.

export type TenantDb = Awaited<ReturnType<typeof getTenantDb>>
export type Evidence = typeof regulatoryItemEvidence.$inferSelect

export type TeamMember = { id: string; name: string; position: string | null }

export async function recordEvent(db: TenantDb, input: {
  itemId: string
  tenantId: string
  eventType: string
  title: string
  description?: string
  createdBy: string
  metadata?: Record<string, unknown>
}) {
  await db.insert(regulatoryItemEvents).values({
    id: crypto.randomUUID(),
    itemId: input.itemId,
    tenantId: input.tenantId,
    eventType: input.eventType,
    title: input.title,
    description: input.description ?? '',
    metadata: input.metadata ?? {},
    createdBy: input.createdBy,
  })
}

export async function attachEvidence<T extends { id: string }>(db: TenantDb, rows: T[]) {
  if (!rows.length) return rows.map((row) => ({ ...row, evidence: [] as Evidence[] }))
  const evidence = await db
    .select()
    .from(regulatoryItemEvidence)
    .where(inArray(regulatoryItemEvidence.itemId, rows.map((row) => row.id)))
    .orderBy(desc(regulatoryItemEvidence.createdAt))
  return rows.map((row) => ({ ...row, evidence: evidence.filter((entry) => entry.itemId === row.id) }))
}

/**
 * Equipo asignable del cliente. Con base propia sale de `members`; si el cliente
 * aún vive en la principal (no hay `members`), de sus usuarios: el id es el del usuario.
 */
export async function listTeam(tenantId: string): Promise<TeamMember[]> {
  const own = await getOwnTenantDb(tenantId)
  const rows = own
    ? await own.select({ id: members.id, name: members.name, position: members.position }).from(members).where(eq(members.active, true))
    : (await mainDb.select({ id: user.id, name: user.name }).from(userTenants).innerJoin(user, eq(user.id, userTenants.userId))
      .where(and(eq(userTenants.tenantId, tenantId), inArray(userTenants.role, ['client', 'tenant_admin']))))
      .map((row) => ({ ...row, position: null }))
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

/** Id con el que se asignan asuntos a esta persona: su `members.id`, o su id de usuario sin base propia. */
export async function memberIdOf(tenantId: string, userId: string): Promise<string | null> {
  const own = await getOwnTenantDb(tenantId)
  if (!own) return userId
  const [row] = await own.select({ id: members.id }).from(members).where(and(eq(members.mainUserId, userId), eq(members.active, true))).limit(1)
  return row?.id ?? null
}
