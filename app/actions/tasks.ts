'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getTenantDb } from '@/lib/db/tenant'
import { regulatoryItems, tasks } from '@/lib/db/schema'
import { listTeam, memberIdOf, recordEvent, type TeamMember } from '@/lib/regulatory-items-db'
import { canSeeTask, compareTasks, isTaskStatus, parseTaskInput, TASK_STATUS_LABELS, type TaskInput } from '@/lib/tasks'
import { getFirstTenantId } from './auth-helpers'
import { isTenantAdmin } from './tenant-users'

// Tareas de un asunto. El director (admin del cliente) ve y gestiona todas; el miembro
// ve las que le asignaron, crea tareas en sus propios asuntos y mueve el estatus de las suyas.
// El tenantId sale siempre de la sesión; nunca del navegador.

async function taskContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Tenant not found')
  const [isDirector, memberId, db] = await Promise.all([isTenantAdmin(), memberIdOf(tenantId, session.user.id), getTenantDb(tenantId)])
  return { userId: session.user.id, userName: session.user.name, tenantId, isDirector, memberId, db }
}
type Ctx = Awaited<ReturnType<typeof taskContext>>

export type TaskRow = typeof tasks.$inferSelect & { assigneeName: string | null }
export type MyTask = TaskRow & { itemTitle: string; itemFolio: string | null }

const names = (team: TeamMember[]) => new Map(team.map((member) => [member.id, member.name]))

function revalidateTasks() {
  revalidatePath('/cliente/tareas')
  revalidatePath('/cliente/cumplimiento')
}

async function findTask(ctx: Ctx, id: string) {
  const [row] = await ctx.db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.tenantId, ctx.tenantId))).limit(1)
  if (!row || !canSeeTask(ctx, row)) throw new Error('Tarea no encontrada')
  return row
}

async function assertAssignee(ctx: Ctx, assigneeId: string | null) {
  if (!assigneeId) return null
  const member = (await listTeam(ctx.tenantId)).find((entry) => entry.id === assigneeId)
  if (!member) throw new Error('Persona no encontrada')
  return member
}

/** Tareas de un asunto que el usuario puede ver, más el equipo asignable (solo el director lo recibe). */
export async function getItemTasks(itemId: string) {
  const ctx = await taskContext()
  const team = await listTeam(ctx.tenantId)
  const rows = await ctx.db.select().from(tasks).where(and(eq(tasks.tenantId, ctx.tenantId), eq(tasks.itemId, itemId)))
  const byId = names(team)
  const visible = rows.filter((row) => canSeeTask(ctx, row)).sort(compareTasks)
  return {
    tasks: visible.map((row): TaskRow => ({ ...row, assigneeName: row.assigneeId ? byId.get(row.assigneeId) ?? null : null })),
    team: ctx.isDirector ? team : [],
    isDirector: ctx.isDirector,
  }
}

/** "Mis tareas": las asignadas al usuario; el director ve todas las del cliente. */
export async function getMyTasks() {
  const ctx = await taskContext()
  const team = await listTeam(ctx.tenantId)
  const empty = { tasks: [] as MyTask[], team: [] as TeamMember[], isDirector: ctx.isDirector, memberId: ctx.memberId }
  if (!ctx.isDirector && !ctx.memberId) return empty
  const rows = await ctx.db
    .select()
    .from(tasks)
    .where(ctx.isDirector ? eq(tasks.tenantId, ctx.tenantId) : and(eq(tasks.tenantId, ctx.tenantId), eq(tasks.assigneeId, ctx.memberId!)))
  const itemIds = [...new Set(rows.map((row) => row.itemId))]
  const items = itemIds.length
    ? await ctx.db.select({ id: regulatoryItems.id, title: regulatoryItems.title, source: regulatoryItems.source }).from(regulatoryItems).where(inArray(regulatoryItems.id, itemIds))
    : []
  const itemById = new Map(items.map((item) => [item.id, item]))
  const byId = names(team)
  const result = rows.sort(compareTasks).map((row): MyTask => ({
    ...row,
    assigneeName: row.assigneeId ? byId.get(row.assigneeId) ?? null : null,
    itemTitle: itemById.get(row.itemId)?.title ?? 'Asunto',
    itemFolio: itemById.get(row.itemId)?.source ?? null,
  }))
  return { ...empty, tasks: result, team: ctx.isDirector ? team : [] }
}

export async function createTask(itemId: string, input: TaskInput) {
  const ctx = await taskContext()
  const [item] = await ctx.db
    .select({ id: regulatoryItems.id, assigneeId: regulatoryItems.assigneeId })
    .from(regulatoryItems)
    .where(and(eq(regulatoryItems.id, itemId), eq(regulatoryItems.tenantId, ctx.tenantId)))
    .limit(1)
  if (!item) throw new Error('Asunto no encontrado')
  // El miembro solo agrega tareas a asuntos que tiene asignados, y se las queda él.
  if (!ctx.isDirector && (!ctx.memberId || item.assigneeId !== ctx.memberId)) throw new Error('Forbidden')
  const data = parseTaskInput(ctx.isDirector ? input : { ...input, assigneeId: ctx.memberId })
  const assignee = await assertAssignee(ctx, data.assigneeId)
  const id = crypto.randomUUID()
  await ctx.db.insert(tasks).values({ id, tenantId: ctx.tenantId, itemId, ...data, createdBy: ctx.userId })
  await recordEvent(ctx.db, {
    itemId,
    tenantId: ctx.tenantId,
    eventType: 'task_created',
    title: `Tarea creada: ${data.title}`,
    description: assignee ? `Asignada a ${assignee.name}.` : 'Sin responsable.',
    createdBy: ctx.userId,
    metadata: { taskId: id, assigneeId: data.assigneeId, dueDate: data.dueDate },
  })
  revalidateTasks()
  return { id }
}

/** El director edita título, descripción, responsable y fechas. */
export async function updateTask(id: string, input: TaskInput) {
  const ctx = await taskContext()
  if (!ctx.isDirector) throw new Error('Forbidden')
  const row = await findTask(ctx, id)
  const data = parseTaskInput(input)
  const assignee = await assertAssignee(ctx, data.assigneeId)
  await ctx.db.update(tasks).set({ ...data, updatedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.tenantId, ctx.tenantId)))
  const reassigned = row.assigneeId !== data.assigneeId
  await recordEvent(ctx.db, {
    itemId: row.itemId,
    tenantId: ctx.tenantId,
    eventType: reassigned ? 'task_reassigned' : 'task_updated',
    title: reassigned ? `Tarea reasignada: ${data.title}` : `Tarea editada: ${data.title}`,
    description: reassigned ? (assignee ? `Ahora la tiene ${assignee.name}.` : 'Quedó sin responsable.') : '',
    createdBy: ctx.userId,
    metadata: { taskId: id, assigneeId: data.assigneeId, startDate: data.startDate, dueDate: data.dueDate },
  })
  revalidateTasks()
}

/** Cambia el estatus; lo puede hacer el director o quien tiene la tarea asignada. */
export async function setTaskStatus(id: string, status: string) {
  if (!isTaskStatus(status)) throw new Error('Estatus inválido')
  const ctx = await taskContext()
  const row = await findTask(ctx, id)
  if (row.status === status) return
  await ctx.db
    .update(tasks)
    .set({ status, completedAt: status === 'completada' ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.tenantId, ctx.tenantId)))
  await recordEvent(ctx.db, {
    itemId: row.itemId,
    tenantId: ctx.tenantId,
    eventType: 'task_status_changed',
    title: `Tarea ${TASK_STATUS_LABELS[status].toLowerCase()}: ${row.title}`,
    description: `Pasó de ${TASK_STATUS_LABELS[row.status as keyof typeof TASK_STATUS_LABELS] ?? row.status} a ${TASK_STATUS_LABELS[status]}.`,
    createdBy: ctx.userId,
    metadata: { taskId: id, from: row.status, to: status },
  })
  revalidateTasks()
}

export async function deleteTask(id: string) {
  const ctx = await taskContext()
  if (!ctx.isDirector) throw new Error('Forbidden')
  const row = await findTask(ctx, id)
  await ctx.db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.tenantId, ctx.tenantId)))
  await recordEvent(ctx.db, {
    itemId: row.itemId,
    tenantId: ctx.tenantId,
    eventType: 'task_deleted',
    title: `Tarea eliminada: ${row.title}`,
    createdBy: ctx.userId,
    metadata: { taskId: id },
  })
  revalidateTasks()
}
