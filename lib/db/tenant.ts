import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { Pool } from 'pg'
import { db } from './index'
import * as schema from './schema'
import { decryptDbUrl } from './tenant-crypto'

// Conexión a la base de un despacho. Todo acceso a datos de un despacho pasa
// por aquí; en fase 1 solo cambia de dónde sale la URL (Secrets Manager/KMS).
// Por ahora la base del despacho usa el mismo esquema que la principal.

type TenantDb = NodePgDatabase<typeof schema> & { $client: Pool }

// En globalThis para que el hot reload de `next dev` no abra pools nuevos.
const cache: Map<string, Promise<TenantDb>> =
  ((globalThis as { __tenantDbs?: Map<string, Promise<TenantDb>> }).__tenantDbs ??= new Map())

async function connect(firmId: string): Promise<TenantDb> {
  const [firm] = await db.select().from(schema.firms).where(eq(schema.firms.id, firmId)).limit(1)
  if (!firm) throw new Error(`Despacho no encontrado: ${firmId}`)
  if (firm.status !== 'active') throw new Error(`Despacho no activo: ${firm.slug}`)
  const pool = new Pool({ connectionString: decryptDbUrl(firm.id, firm.dbUrlEncrypted), max: 5 })
  return drizzle(pool, { schema })
}

export function getTenantDb(firmId: string): Promise<TenantDb> {
  let conn = cache.get(firmId)
  if (!conn) {
    conn = connect(firmId)
    cache.set(firmId, conn)
    // Si falla, no dejar el error en caché.
    conn.catch(() => cache.delete(firmId))
  }
  return conn
}

// Cierra el pool de un despacho (p. ej. al suspenderlo o rotar su URL).
export async function closeTenantDb(firmId: string) {
  const conn = cache.get(firmId)
  cache.delete(firmId)
  if (conn) await (await conn.catch(() => null))?.$client.end()
}
