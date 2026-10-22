'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq, and, desc, isNotNull, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { regulatoryItems, regulatoryItemEvidence, regulatoryItemEvents } from '@/lib/db/schema'
import { DIRECTIONS, IMPACTS, MATERIAS, SCOPES, STATUSES, isOneOf } from '@/lib/regulatory'
import { getFirstTenantId, requireAdmin } from './auth-helpers'

export type ItemEvent = typeof regulatoryItemEvents.$inferSelect

export type ItemInput = {
  scope: string
  title: string
  materia: string
  subtema?: string
  description?: string
  instrumentType?: string
  authority?: string
  source: string
  sourceUrl?: string
  stage?: string
  stageDetail?: string
  publishedAt?: string
  dueDate?: string
  impact?: string
  impactDirection?: string
  impactRationale?: string
  generatesObligation?: boolean
  obligationDetail?: string
  comments?: string
  owner?: string
}

async function clientContext() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Tenant not found')
  return { userId: session.user.id, tenantId }
}

const text = (value?: string) => value?.trim() || null
const dateOrNull = (value?: string) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null)

function normalize(input: ItemInput) {
  if (!isOneOf(SCOPES, input.scope)) throw new Error('Tipo inválido')
  if (!isOneOf(MATERIAS, input.materia)) throw new Error('Materia inválida')
  if (!input.title?.trim() || !input.source?.trim()) throw new Error('Título y origen son obligatorios')
  if (input.impact && !isOneOf(IMPACTS, input.impact)) throw new Error('Impacto inválido')
  if (input.impactDirection && !isOneOf(DIRECTIONS, input.impactDirection)) throw new Error('Sentido de impacto inválido')
  const url = text(input.sourceUrl)
  if (url && !/^https?:\/\//i.test(url)) throw new Error('El enlace debe iniciar con http(s)')
  return {
    scope: input.scope,
    materia: input.materia,
    subtema: text(input.subtema),
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    instrumentType: text(input.instrumentType),
    authority: text(input.authority),
    source: input.source.trim(),
    sourceUrl: url,
    stage: text(input.stage),
    stageDetail: text(input.stageDetail),
    publishedAt: dateOrNull(input.publishedAt),
    dueDate: dateOrNull(input.dueDate),
    impact: input.impact || null,
    impactDirection: input.impactDirection || null,
    impactRationale: input.impactRationale?.trim() ?? '',
    generatesObligation: Boolean(input.generatesObligation),
    obligationDetail: input.obligationDetail?.trim() ?? '',
    comments: input.comments?.trim() ?? '',
    owner: text(input.owner),
  }
}

async function recordEvent(input: {
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

async function attachEvidence<T extends { id: string }>(rows: T[]) {
  if (!rows.length) return rows.map((row) => ({ ...row, evidence: [] as (typeof regulatoryItemEvidence.$inferSelect)[] }))
  const evidence = await db
    .select()
    .from(regulatoryItemEvidence)
    .where(inArray(regulatoryItemEvidence.itemId, rows.map((row) => row.id)))
    .orderBy(desc(regulatoryItemEvidence.createdAt))
  return rows.map((row) => ({ ...row, evidence: evidence.filter((entry) => entry.itemId === row.id) }))
}

// ── Cliente: solo ve lo que el admin le envió ──────────────────────

export async function getRegulatoryItems() {
  const { tenantId } = await clientContext()
  const rows = await db
    .select()
    .from(regulatoryItems)
    .where(and(eq(regulatoryItems.tenantId, tenantId), isNotNull(regulatoryItems.sentAt)))
    .orderBy(desc(regulatoryItems.publishedAt), desc(regulatoryItems.updatedAt))
  return attachEvidence(rows)
}

export async function getRegulatoryItem(id: string) {
  const { tenantId } = await clientContext()
  const [row] = await db
    .select()
    .from(regulatoryItems)
    .where(and(eq(regulatoryItems.id, id), eq(regulatoryItems.tenantId, tenantId), isNotNull(regulatoryItems.sentAt)))
    .limit(1)
  if (!row) return null
  const [withEvidence] = await attachEvidence([row])
  const events = await db
    .select()
    .from(regulatoryItemEvents)
    .where(and(eq(regulatoryItemEvents.itemId, id), eq(regulatoryItemEvents.tenantId, tenantId)))
    .orderBy(desc(regulatoryItemEvents.createdAt))
  return { ...withEvidence, events }
}

export async function updateItemStatus(id: string, status: string) {
  const { tenantId } = await clientContext()
  if (!isOneOf(STATUSES, status)) throw new Error('Estado inválido')
  const updated = await db
    .update(regulatoryItems)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(regulatoryItems.id, id), eq(regulatoryItems.tenantId, tenantId), isNotNull(regulatoryItems.sentAt)))
    .returning({ id: regulatoryItems.id })
  if (!updated.length) throw new Error('Asunto no encontrado')
  await recordEvent({
    itemId: id,
    tenantId,
    eventType: 'status_changed',
    title: `Estado cambiado a ${status}`,
    description: 'El cliente actualizó el estado del asunto regulatorio.',
    createdBy: (await auth.api.getSession({ headers: await headers() }))?.user.id ?? 'client',
    metadata: { status },
  })
  revalidatePath('/cliente/obligaciones')
  revalidatePath('/cliente')
}

export async function addItemEvidence(input: { itemId: string; kind: string; title: string; content: string; url?: string; blobPathname?: string }) {
  const { userId, tenantId } = await clientContext()
  const parent = await db
    .select({ id: regulatoryItems.id })
    .from(regulatoryItems)
    .where(and(eq(regulatoryItems.id, input.itemId), eq(regulatoryItems.tenantId, tenantId), isNotNull(regulatoryItems.sentAt)))
  if (!parent.length || !input.title.trim()) throw new Error('Asunto inválido')
  await db.insert(regulatoryItemEvidence).values({
    id: crypto.randomUUID(),
    itemId: input.itemId,
    tenantId,
    kind: input.kind,
    title: input.title.trim(),
    content: input.content.trim(),
    url: input.url?.trim() || null,
    blobPathname: input.blobPathname?.trim() || null,
    createdBy: userId,
  })
  const labels = { nota: 'nota', documento: 'documento', evidencia: 'evidencia' }
  await recordEvent({
    itemId: input.itemId,
    tenantId,
    eventType: `${input.kind}_added`,
    title: `Se agregó ${labels[input.kind as keyof typeof labels] ?? input.kind}`,
    description: input.title.trim(),
    createdBy: userId,
  })
  revalidatePath('/cliente/obligaciones')
}

// ── Admin: captura, edición y envío al cliente ─────────────────────

export async function getAdminDashboardData() {
  const tenantId = await getFirstTenantId()
  if (!tenantId) return { items: [], tenantId: null }
  return { items: await getAdminItems(tenantId), tenantId }
}

export async function getAdminItems(tenantId: string) {
  await requireAdmin()
  const rows = await db
    .select()
    .from(regulatoryItems)
    .where(eq(regulatoryItems.tenantId, tenantId))
    .orderBy(desc(regulatoryItems.publishedAt), desc(regulatoryItems.updatedAt))
  return attachEvidence(rows)
}

export async function getAdminItem(id: string) {
  await requireAdmin()
  const [row] = await db.select().from(regulatoryItems).where(eq(regulatoryItems.id, id)).limit(1)
  if (!row) return null
  const [withEvidence] = await attachEvidence([row])
  const events = await db
    .select()
    .from(regulatoryItemEvents)
    .where(eq(regulatoryItemEvents.itemId, id))
    .orderBy(desc(regulatoryItemEvents.createdAt))
  return { ...withEvidence, events }
}

export async function saveRegulatoryItem(tenantId: string, id: string | null, input: ItemInput) {
  await requireAdmin()
  const values = normalize(input)
  const session = await auth.api.getSession({ headers: await headers() })
  const actorId = session?.user.id ?? 'admin'
  if (id) {
    const updated = await db
      .update(regulatoryItems)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(regulatoryItems.id, id), eq(regulatoryItems.tenantId, tenantId)))
      .returning({ id: regulatoryItems.id })
    if (!updated.length) throw new Error('Asunto no encontrado')
    await recordEvent({ itemId: id, tenantId, eventType: 'item_updated', title: 'Se actualizó el asunto', description: 'Se modificaron los datos del expediente.', createdBy: actorId })
  } else {
    const itemId = crypto.randomUUID()
    await db.insert(regulatoryItems).values({ id: itemId, tenantId, createdBy: actorId, ...values })
    await recordEvent({ itemId, tenantId, eventType: 'created', title: 'Asunto identificado', description: 'Se abrió el expediente regulatorio.', createdBy: actorId })
  }
  revalidatePath('/admin/obligaciones')
}

export async function setItemSent(tenantId: string, id: string, sent: boolean) {
  await requireAdmin()
  const updated = await db
    .update(regulatoryItems)
    .set({ sentAt: sent ? new Date() : null, updatedAt: new Date() })
    .where(and(eq(regulatoryItems.id, id), eq(regulatoryItems.tenantId, tenantId)))
    .returning({ id: regulatoryItems.id })
  if (!updated.length) throw new Error('Asunto no encontrado')
  const session = await auth.api.getSession({ headers: await headers() })
  await recordEvent({
    itemId: id,
    tenantId,
    eventType: sent ? 'sent' : 'recalled',
    title: sent ? 'Se envió al cliente' : 'Se retiró de la vista del cliente',
    description: sent ? 'El asunto ahora está disponible para el cliente.' : 'El asunto dejó de estar disponible para el cliente.',
    createdBy: session?.user.id ?? 'admin',
  })
  revalidatePath('/admin/obligaciones')
  revalidatePath('/cliente/obligaciones')
}

export async function setAdminItemStatus(tenantId: string, id: string, status: string) {
  await requireAdmin()
  if (!isOneOf(STATUSES, status)) throw new Error('Estado inválido')
  const updated = await db
    .update(regulatoryItems)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(regulatoryItems.id, id), eq(regulatoryItems.tenantId, tenantId)))
    .returning({ id: regulatoryItems.id })
  if (!updated.length) throw new Error('Asunto no encontrado')
  const session = await auth.api.getSession({ headers: await headers() })
  await recordEvent({ itemId: id, tenantId, eventType: 'status_changed', title: `Estado cambiado a ${status}`, description: 'El equipo actualizó el estado del asunto regulatorio.', createdBy: session?.user.id ?? 'admin', metadata: { status } })
  revalidatePath('/admin/obligaciones')
}

export async function deleteRegulatoryItem(tenantId: string, id: string) {
  await requireAdmin()
  await db.delete(regulatoryItemEvidence).where(and(eq(regulatoryItemEvidence.itemId, id), eq(regulatoryItemEvidence.tenantId, tenantId)))
  await db.delete(regulatoryItemEvents).where(and(eq(regulatoryItemEvents.itemId, id), eq(regulatoryItemEvents.tenantId, tenantId)))
  await db.delete(regulatoryItems).where(and(eq(regulatoryItems.id, id), eq(regulatoryItems.tenantId, tenantId)))
  revalidatePath('/admin/obligaciones')
  revalidatePath('/cliente/obligaciones')
}

export type RegulatoryItem = Awaited<ReturnType<typeof getRegulatoryItems>>[number]
