'use server'

import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { account, session as sessionTable, tenantUserPermissions, user, userTenants } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { deactivateMember, upsertMember } from '@/lib/db/tenant-members'
import { provisionTenantUser } from '@/lib/tenant-users'
import { logAction } from '@/lib/audit'
import { describePermissionChange, DEFAULT_MEMBER_PERMISSIONS, sanitizePermissions, type PermissionMap } from '@/lib/client-permissions'
import { getSession } from './auth-helpers'

// Administración de usuarios por el admin de una empresa cliente (tenant_admin).
// El tenantId sale siempre de la sesión; nunca se acepta del navegador.

const CLIENT_ROLES = ['client', 'tenant_admin'] as const
type ClientRole = (typeof CLIENT_ROLES)[number]

async function requireTenantAdmin() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const [m] = await db.select().from(userTenants)
    .where(and(eq(userTenants.userId, session.user.id), eq(userTenants.role, 'tenant_admin')))
  if (!m) throw new Error('Forbidden')
  return { userId: session.user.id, userName: session.user.name, tenantId: m.tenantId }
}

const actorOf = (a: { userId: string; userName: string; tenantId: string }) => ({ tenantId: a.tenantId, userId: a.userId, userName: a.userName })

/** Verifica que el usuario objetivo sea una persona (no personal de Otero) de este mismo cliente. */
async function requireOwnUser(tenantId: string, targetId: string) {
  const [m] = await db.select().from(userTenants)
    .where(and(eq(userTenants.userId, targetId), eq(userTenants.tenantId, tenantId), inArray(userTenants.role, [...CLIENT_ROLES])))
  if (!m) throw new Error('Usuario no encontrado')
  return m
}

export async function isTenantAdmin() {
  try { await requireTenantAdmin(); return true } catch { return false }
}

export async function listMyTenantUsers() {
  const { tenantId } = await requireTenantAdmin()
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, role: userTenants.role, createdAt: userTenants.createdAt })
    .from(userTenants)
    .innerJoin(user, eq(user.id, userTenants.userId))
    .where(and(eq(userTenants.tenantId, tenantId), inArray(userTenants.role, [...CLIENT_ROLES])))
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export async function createMyTenantUser(data: { name: string; email: string; password: string; role: ClientRole }) {
  const admin = await requireTenantAdmin()
  const { tenantId } = admin
  if (!CLIENT_ROLES.includes(data.role)) throw new Error('Rol inválido')
  if (data.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres')
  const created = await provisionTenantUser({
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    tenantId,
    role: data.role,
  })
  await logAction(actorOf(admin), 'usuario.creado', { entityType: 'usuario', entityId: created.id, entityLabel: data.name.trim(), detail: `Rol: ${data.role === 'tenant_admin' ? 'director' : 'miembro'}` })
  revalidatePath('/cliente/usuarios')
}

export async function updateMyTenantUser(userId: string, data: { name?: string; role?: ClientRole }) {
  const admin = await requireTenantAdmin()
  const { userId: me, tenantId } = admin
  const membership = await requireOwnUser(tenantId, userId)
  if (data.role) {
    if (!CLIENT_ROLES.includes(data.role)) throw new Error('Rol inválido')
    if (userId === me && data.role !== 'tenant_admin') throw new Error('No puedes quitarte el rol de administrador')
  }
  const name = data.name?.trim()
  if (name) await db.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, userId))
  const role = data.role ?? (membership.role as ClientRole)
  if (data.role) await db.update(userTenants).set({ role }).where(eq(userTenants.id, membership.id))
  const [u] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, userId))
  if (u) await upsertMember(tenantId, u, role)
  const changes = [name && 'nombre', data.role && data.role !== membership.role && `rol a ${role === 'tenant_admin' ? 'director' : 'miembro'}`].filter(Boolean).join(', ')
  await logAction(actorOf(admin), 'usuario.editado', { entityType: 'usuario', entityId: userId, entityLabel: u?.name, detail: changes ? `Cambió: ${changes}` : '' })
  revalidatePath('/cliente/usuarios')
}

export async function removeMyTenantUser(userId: string) {
  const admin = await requireTenantAdmin()
  const { userId: me, tenantId } = admin
  if (userId === me) throw new Error('No puedes quitarte a ti mismo')
  const membership = await requireOwnUser(tenantId, userId)
  const [target] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId))
  // Primero se corta el acceso, luego se marca la baja en la base del cliente.
  await db.delete(userTenants).where(eq(userTenants.id, membership.id))
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId))
  await deactivateMember(tenantId, userId)
  await db.delete(tenantUserPermissions).where(and(eq(tenantUserPermissions.tenantId, tenantId), eq(tenantUserPermissions.userId, userId)))
  await logAction(actorOf(admin), 'usuario.eliminado', { entityType: 'usuario', entityId: userId, entityLabel: target?.name })
  const rest = await db.select({ id: userTenants.id }).from(userTenants).where(eq(userTenants.userId, userId))
  if (!rest.length) await db.delete(user).where(eq(user.id, userId))
  revalidatePath('/cliente/usuarios')
}

export async function resetMyTenantUserPassword(userId: string, newPassword: string) {
  const admin = await requireTenantAdmin()
  const { tenantId } = admin
  await requireOwnUser(tenantId, userId)
  if (newPassword.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres')
  const ctx = await auth.$context
  const hash = await ctx.password.hash(newPassword)
  const updated = await db.update(account).set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .returning({ id: account.id })
  if (!updated.length) throw new Error('El usuario no tiene acceso con contraseña')
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId))
  const [target] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId))
  await logAction(actorOf(admin), 'usuario.clave_restablecida', { entityType: 'usuario', entityId: userId, entityLabel: target?.name })
}


/** Permisos personalizados de los miembros del equipo (los directores lo pueden todo). Nulo: aplican los de fábrica. */
export async function listMyTenantPermissions(): Promise<Record<string, PermissionMap | null>> {
  const { tenantId } = await requireTenantAdmin()
  const rows = await db
    .select({ userId: tenantUserPermissions.userId, permissions: tenantUserPermissions.permissions })
    .from(tenantUserPermissions)
    .where(eq(tenantUserPermissions.tenantId, tenantId))
  return Object.fromEntries(rows.map(r => [r.userId, sanitizePermissions(r.permissions)]))
}

/** El director fija qué pantallas y acciones (ver, crear, editar, borrar) tiene un miembro. */
export async function setMyTenantUserPermissions(userId: string, input: unknown) {
  const admin = await requireTenantAdmin()
  const { userId: me, tenantId } = admin
  if (userId === me) throw new Error('No puedes cambiar tus propios permisos')
  const membership = await requireOwnUser(tenantId, userId)
  if (membership.role !== 'client') throw new Error('Los directores tienen todos los permisos')
  const next = sanitizePermissions(input)
  const [prev] = await db
    .select({ permissions: tenantUserPermissions.permissions })
    .from(tenantUserPermissions)
    .where(and(eq(tenantUserPermissions.tenantId, tenantId), eq(tenantUserPermissions.userId, userId)))
  const before = prev ? sanitizePermissions(prev.permissions) : DEFAULT_MEMBER_PERMISSIONS
  await db
    .insert(tenantUserPermissions)
    .values({ tenantId, userId, permissions: next, updatedBy: me })
    .onConflictDoUpdate({ target: [tenantUserPermissions.tenantId, tenantUserPermissions.userId], set: { permissions: next, updatedBy: me, updatedAt: new Date() } })
  const [target] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId))
  const changes = describePermissionChange(before, next)
  await logAction(actorOf(admin), 'usuario.permisos_cambiados', {
    entityType: 'usuario', entityId: userId, entityLabel: target?.name,
    detail: changes.length ? changes.join('; ') : 'Sin cambios',
    metadata: { permissions: next },
  })
  revalidatePath('/cliente/usuarios')
}
