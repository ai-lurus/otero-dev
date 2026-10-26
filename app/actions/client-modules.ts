'use server'

import { and, desc, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/db/tenant'
import { appointments, payments, services, userTenants } from '@/lib/db/schema'

async function tenantForUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const membership = await db.select({ tenantId: userTenants.tenantId }).from(userTenants).where(eq(userTenants.userId, session.user.id)).limit(1)
  if (!membership[0]) throw new Error('Tenant not found')
  const tenantId = membership[0].tenantId
  return { tenantId, tdb: await getTenantDb(tenantId) }
}

export async function getClientServices() {
  const { tenantId, tdb } = await tenantForUser()
  return tdb.select().from(services).where(eq(services.tenantId, tenantId)).orderBy(desc(services.updatedAt))
}

export async function getClientPayments() {
  const { tenantId, tdb } = await tenantForUser()
  return tdb.select().from(payments).where(eq(payments.tenantId, tenantId)).orderBy(desc(payments.createdAt))
}

export async function getClientAppointments() {
  const { tenantId, tdb } = await tenantForUser()
  return tdb.select().from(appointments).where(eq(appointments.tenantId, tenantId)).orderBy(appointments.startsAt)
}

export async function markPaymentPaid(id: string) {
  const { tenantId, tdb } = await tenantForUser()
  const updated = await tdb.update(payments).set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() }).where(and(eq(payments.id, id), eq(payments.tenantId, tenantId))).returning({ id: payments.id })
  if (!updated[0]) throw new Error('Payment not found')
  return updated[0]
}

export async function createClientAppointment(input: { title: string; startsAt: Date; endsAt?: Date; description?: string }) {
  const { tenantId, tdb } = await tenantForUser()
  const [created] = await tdb.insert(appointments).values({ tenantId, title: input.title, startsAt: input.startsAt, endsAt: input.endsAt, description: input.description }).returning()
  return created
}

export type ClientService = Awaited<ReturnType<typeof getClientServices>>[number]
export type ClientPayment = Awaited<ReturnType<typeof getClientPayments>>[number]
export type ClientAppointment = Awaited<ReturnType<typeof getClientAppointments>>[number]
