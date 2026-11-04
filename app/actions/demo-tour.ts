'use server'

import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/db/tenant'
import { upsertMember } from '@/lib/db/tenant-members'
import { companyProfiles, ingestMatches, newsItems, regulatoryItems, tenants, user, userTenants } from '@/lib/db/schema'
import { isDemoMode } from '@/lib/demo'
import { DEMO_PERSONAS, DEMO_TENANT, demoEmail, demoPassword, slugify } from '@/lib/demo-users'
import { profileStatus, type ProfileStatus } from '@/lib/monitoring-profile'
import { provisionTenantUser } from '@/lib/tenant-users'
import { isSuperAdmin, requireAdmin } from './auth-helpers'

// Recorrido del demo (/admin/demo): lee el estado real de cada paso para una
// empresa y ofrece atajos (registrar la empresa demo, crear sus usuarios).
// Los atajos solo corren con DEMO_MODE activo y para superadmin.

async function requireDemoSuper() {
  await requireAdmin()
  if (!(await isSuperAdmin())) throw new Error('Solo un superadmin puede preparar el demo')
  if (!isDemoMode) throw new Error('Los atajos del demo solo funcionan con DEMO_MODE activo')
}

export type DemoTourState = {
  tenants: { id: string; name: string }[]
  tenant: { id: string; name: string; slug: string | null; rfc: string | null } | null
  users: { id: string; name: string; email: string; role: string }[]
  profile: { status: ProfileStatus; confirmedAt: Date | null }
  regwatch: { matches: number; news: number; drafts: number; sent: number }
  firstAssigned: { id: string; title: string; owner: string | null } | null
  firstSent: { id: string; title: string } | null
  canPrepare: boolean
}

const EMPTY_REGWATCH = { matches: 0, news: 0, drafts: 0, sent: 0 }

export async function getDemoTour(tenantId?: string): Promise<DemoTourState> {
  await requireAdmin()
  const canPrepare = isDemoMode && (await isSuperAdmin())
  const list = await db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug, rfc: tenants.rfc })
    .from(tenants).orderBy(desc(tenants.createdAt))
  const tenant = list.find(t => t.id === tenantId) ?? list.find(t => t.slug === DEMO_TENANT.slug) ?? null
  const base = { tenants: list.map(({ id, name }) => ({ id, name })), tenant, canPrepare }
  if (!tenant) {
    return { ...base, users: [], profile: { status: 'vacio', confirmedAt: null }, regwatch: EMPTY_REGWATCH, firstAssigned: null, firstSent: null }
  }

  const users = await db.select({ id: user.id, name: user.name, email: user.email, role: userTenants.role })
    .from(userTenants).innerJoin(user, eq(user.id, userTenants.userId))
    .where(and(eq(userTenants.tenantId, tenant.id), inArray(userTenants.role, ['client', 'tenant_admin'])))
  const [[matches], [news]] = await Promise.all([
    db.select({ n: count() }).from(ingestMatches).where(and(eq(ingestMatches.tenantId, tenant.id), eq(ingestMatches.applies, true))),
    db.select({ n: count() }).from(newsItems).where(eq(newsItems.hidden, false)),
  ])

  try {
    const tdb = await getTenantDb(tenant.id)
    const [[profile], items] = await Promise.all([
      tdb.select().from(companyProfiles).where(eq(companyProfiles.tenantId, tenant.id)).limit(1),
      tdb.select({ id: regulatoryItems.id, title: regulatoryItems.title, owner: regulatoryItems.owner, sentAt: regulatoryItems.sentAt, assigneeId: regulatoryItems.assigneeId })
        .from(regulatoryItems).where(eq(regulatoryItems.tenantId, tenant.id)).orderBy(desc(regulatoryItems.updatedAt)),
    ])
    const sent = items.filter(i => i.sentAt)
    const assigned = sent.find(i => i.assigneeId)
    return {
      ...base,
      users: [...users].sort((a, b) => Number(b.role === 'tenant_admin') - Number(a.role === 'tenant_admin') || a.name.localeCompare(b.name)),
      profile: { status: profileStatus(profile ?? null), confirmedAt: profile?.confirmedAt ?? null },
      regwatch: { matches: matches?.n ?? 0, news: news?.n ?? 0, drafts: items.length - sent.length, sent: sent.length },
      firstAssigned: assigned ? { id: assigned.id, title: assigned.title, owner: assigned.owner } : null,
      firstSent: sent[0] ? { id: sent[0].id, title: sent[0].title } : null,
    }
  } catch (e) {
    console.error('getDemoTour: base del cliente', tenant.id, e)
    return { ...base, users, profile: { status: 'vacio', confirmedAt: null }, regwatch: { ...EMPTY_REGWATCH, matches: matches?.n ?? 0, news: news?.n ?? 0 }, firstAssigned: null, firstSent: null }
  }
}

/** Registra la empresa demo (o devuelve la que ya existe con ese slug). */
export async function createDemoTenant(): Promise<string> {
  await requireDemoSuper()
  const [existing] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, DEMO_TENANT.slug)).limit(1)
  if (existing) return existing.id
  const id = `tenant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  await db.insert(tenants).values({ id, ...DEMO_TENANT })
  revalidatePath('/admin/tenants')
  revalidatePath('/admin/demo')
  return id
}

export type DemoUserResult = { email: string; name: string; role: string; created: boolean }

/**
 * Crea (o reutiliza) las personas demo de una empresa: login, membresía y
 * members en su base. Si la empresa no tiene slug, le pone uno a partir del nombre.
 */
export async function createDemoUsers(tenantId: string): Promise<DemoUserResult[]> {
  await requireDemoSuper()
  const password = demoPassword()
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (!tenant) throw new Error('Empresa no encontrada')
  const slug = tenant.slug ?? slugify(tenant.name)
  if (!slug) throw new Error('La empresa necesita un slug para armar los correos')
  if (!tenant.slug) await db.update(tenants).set({ slug }).where(eq(tenants.id, tenantId))

  const results: DemoUserResult[] = []
  for (const p of DEMO_PERSONAS) {
    const email = demoEmail(p.local, slug)
    const [found] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.email, email)).limit(1)
    if (found) {
      await db.insert(userTenants)
        .values({ id: `ut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, userId: found.id, tenantId, role: p.role })
        .onConflictDoNothing()
      await upsertMember(tenantId, found, p.role)
      results.push({ email, name: found.name, role: p.role, created: false })
    } else {
      await provisionTenantUser({ name: p.name, email, password, tenantId, role: p.role })
      results.push({ email, name: p.name, role: p.role, created: true })
    }
  }
  revalidatePath('/admin/demo')
  revalidatePath('/admin/tenants')
  revalidatePath('/admin/users')
  return results
}
