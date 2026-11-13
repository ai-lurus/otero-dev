'use server'

import { and, desc, eq } from 'drizzle-orm'
import { getTenantDb } from '@/lib/db/tenant'
import { actorOf, requirePermission } from '@/lib/access'
import { logAction } from '@/lib/audit'
import type { PermissionAction, Screen } from '@/lib/client-permissions'
import { appointments, payments, services } from '@/lib/db/schema'

// Servicios, pagos y agenda son de la empresa: el director decide quién los ve y edita.
async function tenantForUser(screen: Screen, action: PermissionAction) {
  const access = await requirePermission(screen, action)
  return { access, tenantId: access.tenantId, tdb: await getTenantDb(access.tenantId) }
}

export async function getClientServices() {
  const { tenantId, tdb } = await tenantForUser('servicios', 'view')
  return tdb.select().from(services).where(eq(services.tenantId, tenantId)).orderBy(desc(services.updatedAt))
}

export async function getClientPayments() {
  const { tenantId, tdb } = await tenantForUser('pagos', 'view')
  return tdb.select().from(payments).where(eq(payments.tenantId, tenantId)).orderBy(desc(payments.createdAt))
}

export async function getClientAppointments() {
  const { tenantId, tdb } = await tenantForUser('agenda', 'view')
  return tdb.select().from(appointments).where(eq(appointments.tenantId, tenantId)).orderBy(appointments.startsAt)
}

export async function markPaymentPaid(id: string) {
  const { access, tenantId, tdb } = await tenantForUser('pagos', 'edit')
  const updated = await tdb.update(payments).set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() }).where(and(eq(payments.id, id), eq(payments.tenantId, tenantId))).returning({ id: payments.id })
  if (!updated[0]) throw new Error('Payment not found')
  await logAction(actorOf(access), 'empresa.pago_marcado', { entityType: 'pago', entityId: id })
  return updated[0]
}

export async function createClientAppointment(input: { title: string; startsAt: Date; endsAt?: Date; description?: string }) {
  const { access, tenantId, tdb } = await tenantForUser('agenda', 'create')
  const [created] = await tdb.insert(appointments).values({ tenantId, title: input.title, startsAt: input.startsAt, endsAt: input.endsAt, description: input.description }).returning()
  await logAction(actorOf(access), 'empresa.cita_creada', { entityType: 'cita', entityId: String(created.id), entityLabel: input.title })
  return created
}

export type ClientService = Awaited<ReturnType<typeof getClientServices>>[number]
export type ClientPayment = Awaited<ReturnType<typeof getClientPayments>>[number]
export type ClientAppointment = Awaited<ReturnType<typeof getClientAppointments>>[number]
