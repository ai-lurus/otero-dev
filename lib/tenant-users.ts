import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, userTenants } from '@/lib/db/schema'
import { upsertMember } from '@/lib/db/tenant-members'

/** Roles de acceso de una persona de la empresa cliente (los de Otero son admin y superadmin). */
export const isClientRole = (role: string) => role === 'client' || role === 'tenant_admin'

/**
 * Crea un usuario y lo da de alta en un cliente: user (login) -> user_tenants ->
 * members en la base del cliente, si la tiene. Si un paso falla, deshace lo anterior.
 * Quien llama debe haber validado permisos.
 */
export async function provisionTenantUser(data: {
  name: string
  email: string
  password: string
  tenantId: string
  role: 'admin' | 'tenant_admin' | 'client'
}) {
  const created = await auth.api.signUpEmail({
    body: { email: data.email, password: data.password, name: data.name },
  })
  if (!created?.user?.id) throw new Error('No se pudo crear el usuario')

  try {
    await db.insert(userTenants).values({
      id: `ut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: created.user.id,
      tenantId: data.tenantId,
      role: data.role,
    }).onConflictDoNothing()
    // El personal de Otero ('admin') vive solo en la base principal.
    if (isClientRole(data.role)) await upsertMember(data.tenantId, created.user, data.role)
  } catch (err) {
    await db.delete(userTenants).where(eq(userTenants.userId, created.user.id))
    await db.delete(user).where(eq(user.id, created.user.id))
    throw err
  }
  return created.user
}
