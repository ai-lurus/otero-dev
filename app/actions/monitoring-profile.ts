'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/db/tenant'
import { companyProfiles, tenants, userTenants } from '@/lib/db/schema'
import { MATERIA_KEYS } from '@/lib/ingest/categories'
import { profileStatus, sanitizeMonitoring, type MonitoringFields, type ProfileStatus } from '@/lib/monitoring-profile'
import { getSession, requireAdmin } from './auth-helpers'

// Perfil de monitoreo de un cliente. El despacho lo llena desde el admin
// (incluidas las materias que le vigila); el admin del cliente lo corrige y lo
// confirma desde su perfil, sin poder cambiar las materias contratadas.

async function readProfile(tenantId: string) {
  const tdb = await getTenantDb(tenantId)
  const [profile] = await tdb.select().from(companyProfiles).where(eq(companyProfiles.tenantId, tenantId)).limit(1)
  return profile ?? null
}

async function writeProfile(tenantId: string, values: Partial<typeof companyProfiles.$inferInsert>) {
  const tdb = await getTenantDb(tenantId)
  await tdb.insert(companyProfiles)
    .values({ tenantId, ...values, updatedAt: new Date() })
    .onConflictDoUpdate({ target: companyProfiles.tenantId, set: { ...values, updatedAt: new Date() } })
  revalidatePath('/admin/tenants')
  revalidatePath('/cliente/perfil')
  revalidatePath('/cliente/obligaciones')
}

export async function getMonitoringProfileForAdmin(tenantId: string) {
  await requireAdmin()
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (!tenant) throw new Error('Empresa no encontrada')
  return { tenant, profile: await readProfile(tenantId) }
}

/** Estado del perfil de cada cliente, para la lista de empresas. Un cliente cuya base no responde queda fuera. */
export async function getMonitoringStatuses(): Promise<Record<string, { status: ProfileStatus; confirmed: boolean }>> {
  await requireAdmin()
  const list = await db.select({ id: tenants.id }).from(tenants)
  const entries = await Promise.all(list.map(async (t) => {
    try {
      const profile = await readProfile(t.id)
      return [t.id, { status: profileStatus(profile), confirmed: Boolean(profile?.confirmedAt) }] as const
    } catch (e) {
      console.error('getMonitoringStatuses', t.id, e)
      return null
    }
  }))
  return Object.fromEntries(entries.filter(e => e !== null))
}

export async function saveMonitoringProfileAsAdmin(tenantId: string, input: MonitoringFields) {
  await requireAdmin()
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (!tenant) throw new Error('Empresa no encontrada')
  const clean = sanitizeMonitoring(input, MATERIA_KEYS)
  await writeProfile(tenantId, {
    scian: clean.scian,
    stateList: clean.stateList,
    triggers: clean.triggers,
    materias: clean.materias?.length ? clean.materias : null,
    ...(clean.employees ? { employees: clean.employees } : {}),
  })
}

async function requireTenantAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const [m] = await db.select().from(userTenants)
    .where(and(eq(userTenants.userId, session.user.id), eq(userTenants.role, 'tenant_admin')))
  if (!m) throw new Error('Forbidden')
  return { userId: session.user.id, tenantId: m.tenantId }
}

/** El admin del cliente corrige su perfil y, si lo indica, lo confirma. Las materias contratadas no se tocan. */
export async function saveMyMonitoringProfile(input: MonitoringFields, confirm: boolean) {
  const { userId, tenantId } = await requireTenantAdmin()
  const clean = sanitizeMonitoring(input, MATERIA_KEYS)
  await writeProfile(tenantId, {
    scian: clean.scian,
    stateList: clean.stateList,
    triggers: clean.triggers,
    ...(clean.employees ? { employees: clean.employees } : {}),
    ...(confirm ? { confirmedAt: new Date(), confirmedBy: userId } : {}),
  })
}
