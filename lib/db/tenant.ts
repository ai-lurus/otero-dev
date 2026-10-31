import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { Pool } from 'pg'
import { db } from './index'
import * as schema from './schema'
import { explicitSsl } from './pg-url'
import { decryptDbUrl } from './tenant-crypto'

// Conexión a la base de un cliente (tenant). Todo acceso a datos de un cliente
// pasa por aquí; en fase 1 solo cambia de dónde sale la URL (Secrets Manager/KMS).
// Un cliente sin base propia (dbUrlEncrypted nulo) sigue en la base principal.
// Por ahora la base del cliente usa el mismo esquema que la principal.

type TenantDb = NodePgDatabase<typeof schema>

// En globalThis para que el hot reload de `next dev` no abra pools nuevos.
const cache: Map<string, Promise<TenantDb | null>> =
  ((globalThis as { __tenantDbs?: Map<string, Promise<TenantDb | null>> }).__tenantDbs ??= new Map())
const pools = new Map<string, Pool>()

async function connect(tenantId: string): Promise<TenantDb | null> {
  const [tenant] = await db
    .select({ id: schema.tenants.id, dbUrlEncrypted: schema.tenants.dbUrlEncrypted })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1)
  if (!tenant) throw new Error(`Cliente no encontrado: ${tenantId}`)
  if (!tenant.dbUrlEncrypted) return null
  const pool = new Pool({ connectionString: explicitSsl(decryptDbUrl(tenant.id, tenant.dbUrlEncrypted)), max: 5 })
  pools.set(tenantId, pool)
  return drizzle(pool, { schema })
}

// Base propia del cliente, o null si todavía vive en la principal.
export function getOwnTenantDb(tenantId: string): Promise<TenantDb | null> {
  let conn = cache.get(tenantId)
  if (!conn) {
    conn = connect(tenantId)
    cache.set(tenantId, conn)
    // Si falla, no dejar el error en caché.
    conn.catch(() => cache.delete(tenantId))
  }
  return conn
}

export async function getTenantDb(tenantId: string): Promise<TenantDb> {
  return (await getOwnTenantDb(tenantId)) ?? db
}

// Cierra el pool de un cliente (p. ej. al cambiar o quitar su URL).
export async function closeTenantDb(tenantId: string) {
  cache.delete(tenantId)
  const pool = pools.get(tenantId)
  pools.delete(tenantId)
  await pool?.end()
}
