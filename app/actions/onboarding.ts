'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/db/tenant'
import { companyProfiles, tenants, user, userTenants } from '@/lib/db/schema'
import { sanitizeMonitoring, type MonitoringFields } from '@/lib/monitoring-profile'
import { MATERIA_KEYS } from '@/lib/ingest/categories'
import { companyReady, sanitizeCompany, type CompanyFields } from '@/lib/onboarding'
import { getSession } from './auth-helpers'

// Alta del cliente (lib/onboarding.ts). La lee cualquiera de la empresa; solo
// el admin del cliente (tenant_admin) la guarda. El tenant sale de la sesión.

async function membership() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const rows = await db.select().from(userTenants).where(eq(userTenants.userId, session.user.id))
  const admin = rows.find(r => r.role === 'tenant_admin')
  const any = admin ?? rows.find(r => r.role === 'client')
  if (!any) throw new Error('Sin empresa')
  return { userId: session.user.id, tenantId: any.tenantId, isAdmin: Boolean(admin) }
}

export type OnboardingState = {
  tenantName: string
  isAdmin: boolean
  done: boolean
  profile: (CompanyFields & MonitoringFields) | null
  team: { id: string; name: string; email: string; role: string }[]
}

export async function getOnboardingState(): Promise<OnboardingState> {
  const { tenantId, isAdmin } = await membership()
  const tdb = await getTenantDb(tenantId)
  const [[tenant], [profile], team] = await Promise.all([
    db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1),
    tdb.select().from(companyProfiles).where(eq(companyProfiles.tenantId, tenantId)).limit(1),
    db.select({ id: user.id, name: user.name, email: user.email, role: userTenants.role })
      .from(userTenants).innerJoin(user, eq(user.id, userTenants.userId))
      .where(and(eq(userTenants.tenantId, tenantId), inArray(userTenants.role, ['client', 'tenant_admin']))),
  ])
  return {
    tenantName: tenant?.name ?? 'Tu empresa',
    isAdmin,
    done: Boolean(profile?.confirmedAt),
    profile: profile ?? null,
    team: team.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/** ¿Falta que el admin del cliente termine su alta? Para el aviso del inicio; nunca truena. */
export async function needsOnboarding(): Promise<boolean> {
  try {
    const { tenantId, isAdmin } = await membership()
    if (!isAdmin) return false
    const tdb = await getTenantDb(tenantId)
    const [profile] = await tdb.select({ confirmedAt: companyProfiles.confirmedAt })
      .from(companyProfiles).where(eq(companyProfiles.tenantId, tenantId)).limit(1)
    return !profile?.confirmedAt
  } catch (e) {
    console.error('needsOnboarding', e)
    return false
  }
}

/** Guarda la empresa y el perfil de monitoreo, y confirma el perfil. Las materias contratadas no se tocan. */
export async function completeOnboarding(input: { company: Partial<CompanyFields>; monitoring: MonitoringFields }) {
  const { userId, tenantId, isAdmin } = await membership()
  if (!isAdmin) throw new Error('Solo el administrador de tu empresa puede completar el alta')
  const company = sanitizeCompany(input.company ?? {})
  if (!companyReady(company)) throw new Error('Describe a qué se dedica tu empresa y sus actividades principales')
  const clean = sanitizeMonitoring(input.monitoring ?? {}, MATERIA_KEYS)
  if (!clean.scian || !clean.stateList.length) throw new Error('Elige la actividad y al menos un estado donde operas')

  const values = {
    ...company,
    employees: clean.employees ?? company.employees,
    states: company.states || clean.stateList.join(', '),
    scian: clean.scian,
    stateList: clean.stateList,
    triggers: clean.triggers,
    confirmedAt: new Date(),
    confirmedBy: userId,
    updatedAt: new Date(),
  }
  const tdb = await getTenantDb(tenantId)
  await tdb.insert(companyProfiles)
    .values({ tenantId, ...values })
    .onConflictDoUpdate({ target: companyProfiles.tenantId, set: values })

  revalidatePath('/cliente')
  revalidatePath('/cliente/perfil')
  revalidatePath('/cliente/bienvenida')
  revalidatePath('/admin/tenants')
  revalidatePath('/admin/demo')
}
