import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { tenantUserPermissions } from '@/lib/db/schema'
import { getFirstTenantId } from '@/app/actions/auth-helpers'
import { isTenantAdmin } from '@/app/actions/tenant-users'
import { can, sanitizePermissions, type PermissionAction, type PermissionMap, type Screen } from '@/lib/client-permissions'
import type { AuditActor } from '@/lib/audit'

// Quién es la persona que llama y qué le toca hacer. Todo sale de la sesión;
// nada de esto se acepta del navegador. No es un archivo 'use server'.

export type Access = {
  userId: string
  userName: string
  tenantId: string
  isDirector: boolean
  /** Nulo si el director nunca personalizó los permisos de esta persona. */
  permissions: PermissionMap | null
}

/** Permisos guardados de una persona, o null si aplican los de fábrica. */
export async function loadPermissions(tenantId: string, userId: string): Promise<PermissionMap | null> {
  const [row] = await db
    .select({ permissions: tenantUserPermissions.permissions })
    .from(tenantUserPermissions)
    .where(and(eq(tenantUserPermissions.tenantId, tenantId), eq(tenantUserPermissions.userId, userId)))
    .limit(1)
  return row ? sanitizePermissions(row.permissions) : null
}

export async function getAccess(): Promise<Access | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const tenantId = await getFirstTenantId()
  if (!tenantId) return null
  const isDirector = await isTenantAdmin()
  const permissions = isDirector ? null : await loadPermissions(tenantId, session.user.id)
  return { userId: session.user.id, userName: session.user.name, tenantId, isDirector, permissions }
}

export const actorOf = (access: Access): AuditActor => ({
  tenantId: access.tenantId,
  userId: access.userId,
  userName: access.userName,
})

/** Lanza Forbidden si la persona no tiene ese permiso. El director siempre lo tiene. */
export async function requirePermission(screen: Screen, action: PermissionAction): Promise<Access> {
  const access = await getAccess()
  if (!access || !can(access, screen, action)) throw new Error('Forbidden')
  return access
}
