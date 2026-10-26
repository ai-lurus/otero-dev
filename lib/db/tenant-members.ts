import { eq } from 'drizzle-orm'
import { getOwnTenantDb } from './tenant'
import { members } from './tenant-schema'

// Mantiene `members` (base del cliente) alineada con los usuarios de la base
// principal. La principal manda: si un paso aquí falla, quien llama deshace
// lo que hizo en la principal. Sin base propia no hay nada que sincronizar.

// Rol de acceso en la principal -> rol dentro de la empresa.
export const memberRole = (accessRole: string) => (accessRole === 'tenant_admin' ? 'admin' : 'member')

export async function upsertMember(tenantId: string, u: { id: string; name: string }, accessRole = 'client') {
  const tdb = await getOwnTenantDb(tenantId)
  if (!tdb) return
  await tdb
    .insert(members)
    .values({ id: `m-${crypto.randomUUID()}`, mainUserId: u.id, name: u.name, role: memberRole(accessRole) })
    .onConflictDoUpdate({ target: members.mainUserId, set: { name: u.name, role: memberRole(accessRole), active: true, updatedAt: new Date() } })
}

export async function deactivateMember(tenantId: string, mainUserId: string) {
  const tdb = await getOwnTenantDb(tenantId)
  if (!tdb) return
  await tdb.update(members).set({ active: false, updatedAt: new Date() }).where(eq(members.mainUserId, mainUserId))
}

export async function renameMember(tenantId: string, mainUserId: string, name: string) {
  const tdb = await getOwnTenantDb(tenantId)
  if (!tdb) return
  await tdb.update(members).set({ name, updatedAt: new Date() }).where(eq(members.mainUserId, mainUserId))
}
