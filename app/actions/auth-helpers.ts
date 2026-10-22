'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userTenants, tenants } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Returns the current user id or throws Unauthorized. */
export async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

/** Returns the user's role for a given tenant, or null if no membership. */
export async function getUserRole(tenantId: string): Promise<string | null> {
  const userId = await getUserId()
  const rows = await db
    .select()
    .from(userTenants)
    .where(eq(userTenants.userId, userId))
  const membership = rows.find(r => r.tenantId === tenantId || r.role === 'superadmin')
  return membership?.role ?? null
}

/** Returns true if the current user is a superadmin. */
export async function isSuperAdmin(): Promise<boolean> {
  const userId = await getUserId()
  const rows = await db.select().from(userTenants).where(eq(userTenants.userId, userId))
  return rows.some(r => r.role === 'superadmin')
}

/** Returns true if the current user has an admin or superadmin membership. */
export async function isAdminUser(): Promise<boolean> {
  const session = await getSession()
  if (!session?.user) return false
  const rows = await db.select().from(userTenants).where(eq(userTenants.userId, session.user.id))
  return rows.some(r => r.role === 'admin' || r.role === 'superadmin')
}

/** Throws unless the current user is an admin or superadmin. */
export async function requireAdmin(): Promise<string> {
  const userId = await getUserId()
  const rows = await db.select().from(userTenants).where(eq(userTenants.userId, userId))
  if (!rows.some(r => r.role === 'admin' || r.role === 'superadmin')) throw new Error('Forbidden')
  return userId
}

/** Returns the landing path for the current user based on role. */
export async function getHomePath(): Promise<string> {
  return (await isAdminUser()) ? '/admin' : '/cliente'
}

/** Returns the first tenantId the current user belongs to. */
export async function getFirstTenantId(): Promise<string | null> {
  const userId = await getUserId()
  const rows = await db.select().from(userTenants).where(eq(userTenants.userId, userId))
  return rows[0]?.tenantId ?? null
}

export async function getCurrentTenantName(): Promise<string | null> {
  const tenantId = await getFirstTenantId()
  if (!tenantId) return null
  const rows = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  return rows[0]?.name ?? null
}
