'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getTenantDb } from '@/lib/db/tenant'
import { regulatoryItems } from '@/lib/db/schema'
import { attachEvidence, listTeam, memberIdOf, recordEvent, type TeamMember } from '@/lib/regulatory-items-db'
import { canMoveTo, isStage, stageLabel, type Stage } from '@/lib/compliance-board'
import { BOARD_STATUSES } from '@/lib/client-access'
import { getFirstTenantId } from './auth-helpers'
import { isTenantAdmin } from './tenant-users'

// Tablero "Mi cumplimiento". El abogado ve y mueve solo lo que tiene asignado;
// el director (admin del cliente) ve todo, reasigna y marca como cumplido.

// Un asunto entra al tablero al aceptarse y queda ahí al cerrarse (Cumplido); los descartados o archivados salen.
const ON_BOARD: string[] = [...BOARD_STATUSES]

async function boardContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Tenant not found')
  const [isDirector, memberId, db] = await Promise.all([isTenantAdmin(), memberIdOf(tenantId, session.user.id), getTenantDb(tenantId)])
  return { userId: session.user.id, userName: session.user.name, tenantId, isDirector, memberId, db }
}

const onBoard = (tenantId: string) =>
  and(eq(regulatoryItems.tenantId, tenantId), isNotNull(regulatoryItems.sentAt), inArray(regulatoryItems.status, ON_BOARD))

/** Etapa guardada, o la que corresponde a un asunto aceptado antes de que existieran las etapas. */
const stageFor = (row: { executionStatus: string | null; status: string }): Stage =>
  isStage(row.executionStatus) ? row.executionStatus : row.status === 'cerrada' ? 'cumplido' : 'por_hacer'

export type BoardViewer = { memberId: string | null; name: string; position: string | null; isDirector: boolean }

export async function getComplianceBoard() {
  const { userName, tenantId, isDirector, memberId, db } = await boardContext()
  const team = await listTeam(tenantId)
  const me = team.find((member) => member.id === memberId)
  const viewer: BoardViewer = { memberId, name: me?.name ?? userName, position: me?.position ?? null, isDirector }
  // El abogado solo recibe lo suyo; sin ficha en el equipo no tiene nada asignado.
  if (!isDirector && !memberId) return { items: [], viewer, team: [] as TeamMember[] }
  const rows = await db
    .select()
    .from(regulatoryItems)
    .where(isDirector ? onBoard(tenantId) : and(onBoard(tenantId), eq(regulatoryItems.assigneeId, memberId!)))
    .orderBy(regulatoryItems.dueDate, desc(regulatoryItems.updatedAt))
  const withStage = rows.map((row) => ({ ...row, executionStatus: stageFor(row) as string | null }))
  return { items: await attachEvidence(db, withStage), viewer, team: isDirector ? team : [] }
}

export type BoardItem = Awaited<ReturnType<typeof getComplianceBoard>>['items'][number]

async function findBoardItem(ctx: Awaited<ReturnType<typeof boardContext>>, id: string) {
  const [row] = await ctx.db
    .select({ id: regulatoryItems.id, executionStatus: regulatoryItems.executionStatus, status: regulatoryItems.status, assigneeId: regulatoryItems.assigneeId })
    .from(regulatoryItems)
    .where(and(eq(regulatoryItems.id, id), onBoard(ctx.tenantId)))
    .limit(1)
  if (!row) throw new Error('Asunto no encontrado')
  if (!ctx.isDirector && (!ctx.memberId || row.assigneeId !== ctx.memberId)) throw new Error('Forbidden')
  return row
}

/** Mueve el asunto a otra etapa del tablero y lo deja en su bitácora. */
export async function moveExecution(id: string, to: string) {
  if (!isStage(to)) throw new Error('Etapa inválida')
  const ctx = await boardContext()
  const row = await findBoardItem(ctx, id)
  const from = stageFor(row)
  if (from === to) return
  // Lo cumplido solo lo reabre el director, igual que solo él lo marca.
  if (!canMoveTo(to, ctx.isDirector) || (!ctx.isDirector && from === 'cumplido')) throw new Error('Forbidden')
  await ctx.db
    .update(regulatoryItems)
    // Cumplido es lo mismo que Cerrado en la bandeja de RegWatch; reabrirlo lo regresa a seguimiento.
    .set({ executionStatus: to, status: to === 'cumplido' ? 'cerrada' : 'aceptada', updatedAt: new Date() })
    .where(and(eq(regulatoryItems.id, id), eq(regulatoryItems.tenantId, ctx.tenantId)))
  await recordEvent(ctx.db, {
    itemId: id,
    tenantId: ctx.tenantId,
    eventType: 'execution_changed',
    title: `Movido a ${stageLabel(to)}`,
    description: `Pasó de ${stageLabel(from)} a ${stageLabel(to)}.`,
    createdBy: ctx.userId,
    metadata: { from, to },
  })
  revalidatePath('/cliente/cumplimiento')
}

/** El director cambia al responsable de un asunto que ya está en el tablero. */
export async function reassignItem(id: string, memberId: string) {
  const ctx = await boardContext()
  if (!ctx.isDirector) throw new Error('Forbidden')
  await findBoardItem(ctx, id)
  const member = (await listTeam(ctx.tenantId)).find((entry) => entry.id === memberId)
  if (!member) throw new Error('Persona no encontrada')
  await ctx.db
    .update(regulatoryItems)
    .set({ owner: member.name, assigneeId: member.id, updatedAt: new Date() })
    .where(and(eq(regulatoryItems.id, id), eq(regulatoryItems.tenantId, ctx.tenantId)))
  await recordEvent(ctx.db, {
    itemId: id,
    tenantId: ctx.tenantId,
    eventType: 'reassigned',
    title: `Reasignado a ${member.name}`,
    description: 'El director cambió al responsable del asunto.',
    createdBy: ctx.userId,
    metadata: { assigneeId: member.id },
  })
  revalidatePath('/cliente/cumplimiento')
  revalidatePath('/cliente/obligaciones')
}
