'use server'

import { db } from '@/lib/db'
import { tenants, userTenants, user, session as sessionTable } from '@/lib/db/schema'
import { upsertMember, deactivateMember, renameMember } from '@/lib/db/tenant-members'
import { eq, desc, and } from 'drizzle-orm'
import { account } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { isSuperAdmin, requireAdmin, getSession } from './auth-helpers'
import { revalidatePath } from 'next/cache'

async function requireSuper() {
  if (!(await isSuperAdmin())) throw new Error('Forbidden')
}

async function requireCanManage(targetUserId: string) {
  await requireAdmin()
  const memberships = await db
    .select({ role: userTenants.role })
    .from(userTenants)
    .where(eq(userTenants.userId, targetUserId))
  if (memberships.some(m => m.role === 'admin' || m.role === 'superadmin')) await requireSuper()
}

// ── Tenants ────────────────────────────────────────────────────────

export async function getTenants() {
  await requireAdmin()
  return db.select().from(tenants).orderBy(desc(tenants.createdAt))
}

export async function createTenant(data: { name: string; rfc?: string; industry?: string }) {
  await requireSuper()
  const id = `tenant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  await db.insert(tenants).values({ id, ...data })
  revalidatePath('/admin')
  revalidatePath('/admin/tenants')
  return id
}

export async function deleteTenant(id: string) {
  await requireSuper()
  await db.delete(userTenants).where(eq(userTenants.tenantId, id))
  await db.delete(tenants).where(eq(tenants.id, id))
  revalidatePath('/admin')
  revalidatePath('/admin/tenants')
}

// ── Users ──────────────────────────────────────────────────────────

export async function getUsersForTenant(tenantId: string) {
  await requireAdmin()
  const memberships = await db
    .select({ userId: userTenants.userId, role: userTenants.role, createdAt: userTenants.createdAt })
    .from(userTenants)
    .where(eq(userTenants.tenantId, tenantId))

  const userIds = memberships.map(m => m.userId)
  if (!userIds.length) return []

  const users = await db.select().from(user)
  return memberships.map(m => {
    const u = users.find(u => u.id === m.userId)
    return { ...u, role: m.role, membershipCreatedAt: m.createdAt }
  }).filter(Boolean)
}

export async function getAllUsers() {
  await requireAdmin()
  return db.select().from(user).orderBy(desc(user.createdAt))
}

/**
 * Creates a new user via Better Auth and optionally assigns them to a tenant.
 */
export async function createUser(data: {
  name: string
  email: string
  password: string
  tenantId: string
  role: 'admin' | 'client'
}) {
  await requireAdmin()
  if (data.role !== 'admin' && data.role !== 'client') throw new Error('Rol inválido')
  if (data.role === 'admin') await requireSuper()

  // Use Better Auth admin API to create the user with a hashed password
  const newUser = await auth.api.signUpEmail({
    body: { email: data.email, password: data.password, name: data.name },
  })

  if (!newUser?.user?.id) throw new Error('No se pudo crear el usuario')

  // Assign to tenant, then mirror in the client's own DB (if any). Otero staff
  // ('admin') live only in the main DB.
  try {
    await db.insert(userTenants).values({
      id: `ut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: newUser.user.id,
      tenantId: data.tenantId,
      role: data.role,
    }).onConflictDoNothing()
    if (data.role === 'client') await upsertMember(data.tenantId, newUser.user)
  } catch (err) {
    await db.delete(userTenants).where(eq(userTenants.userId, newUser.user.id))
    await db.delete(user).where(eq(user.id, newUser.user.id))
    throw err
  }

  revalidatePath('/admin/users')
  revalidatePath('/admin')
  return newUser.user
}

export async function updateUser(userId: string, data: { name?: string; email?: string }) {
  await requireCanManage(userId)
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (data.name)  updates.name  = data.name.trim()
  if (data.email) updates.email = data.email.trim().toLowerCase()
  await db.update(user).set(updates).where(eq(user.id, userId))
  if (data.name) {
    const clientTenants = await db.select({ tenantId: userTenants.tenantId }).from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.role, 'client')))
    for (const t of clientTenants) await renameMember(t.tenantId, userId, updates.name as string)
  }
  revalidatePath('/admin/users')
}

export async function updateUserRole(userId: string, tenantId: string, role: string) {
  if (role === 'superadmin' || role === 'admin') await requireSuper()
  else await requireCanManage(userId)
  if (!['client', 'admin', 'superadmin'].includes(role)) throw new Error('Rol inválido')
  await db
    .update(userTenants)
    .set({ role })
    .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
  if (role === 'client') {
    const [u] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, userId))
    if (u) await upsertMember(tenantId, u)
  } else {
    await deactivateMember(tenantId, userId)
  }
  revalidatePath('/admin/users')
}

export async function removeUserFromTenant(userId: string, tenantId: string) {
  await requireCanManage(userId)
  await db.delete(userTenants).where(
    and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId))
  )
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId))
  await deactivateMember(tenantId, userId)
  revalidatePath('/admin/users')
}

export async function updateTenantSlug(tenantId: string, slug: string) {
  await requireSuper()
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '')
  if (!clean) throw new Error('Slug inválido')
  await db.update(tenants).set({ slug: clean }).where(eq(tenants.id, tenantId))
  revalidatePath('/admin/tenants')
}

export async function getTenantBySlug(slug: string) {
  await requireAdmin()
  const rows = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1)
  return rows[0] ?? null
}

export async function getUsersWithTenants() {
  await requireAdmin()
  const allUsers    = await db.select().from(user).orderBy(desc(user.createdAt))
  const allMembers  = await db.select().from(userTenants)
  const allTenants  = await db.select().from(tenants)

  return allUsers.map(u => ({
    ...u,
    memberships: allMembers
      .filter(m => m.userId === u.id)
      .map(m => ({ ...m, tenant: allTenants.find(t => t.id === m.tenantId) })),
  }))
}

export async function deleteUser(userId: string) {
  await requireSuper()
  const session = await getSession()
  if (session?.user.id === userId) throw new Error('No puedes eliminar tu propia cuenta')
  // Primero se corta el acceso en la principal, luego se marca la baja en cada base de cliente.
  const memberships = await db.select({ tenantId: userTenants.tenantId }).from(userTenants).where(eq(userTenants.userId, userId))
  await db.delete(userTenants).where(eq(userTenants.userId, userId))
  await db.delete(user).where(eq(user.id, userId))
  for (const m of memberships) await deactivateMember(m.tenantId, userId)
  revalidatePath('/admin/users')
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireCanManage(userId)
  if (newPassword.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres')
  const ctx = await auth.$context
  const hash = await ctx.password.hash(newPassword)
  const updated = await db
    .update(account)
    .set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .returning({ id: account.id })
  if (!updated.length) throw new Error('El usuario no tiene acceso con contraseña')
}
