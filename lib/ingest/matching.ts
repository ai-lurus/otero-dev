import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/db/tenant'
import { companyProfiles, ingestMatches, tenants, type IngestSource } from '@/lib/db/schema'
import { matchTenant } from './match'

// Calcula (por reglas, sin IA) a qué clientes aplica una fuente categorizada y
// lo guarda en ingest_matches. Un cliente cuya base no responde se omite: el
// resto se guarda igual y ese se reintenta al abrir el detalle.
export async function computeMatches(source: Pick<IngestSource, 'id' | 'materia'>) {
  const list = await db.select().from(tenants)
  const rows: (typeof ingestMatches.$inferInsert)[] = []
  await Promise.all(list.map(async (tenant) => {
    try {
      const tdb = await getTenantDb(tenant.id)
      const [profile] = await tdb.select().from(companyProfiles).where(eq(companyProfiles.tenantId, tenant.id)).limit(1)
      const match = matchTenant(source.materia, { ...profile, industry: [tenant.industry, profile?.industry].filter(Boolean).join(' ') })
      rows.push({ sourceId: source.id, tenantId: tenant.id, ...match })
    } catch (e) {
      console.error('computeMatches', tenant.id, e)
    }
  }))
  // Upsert y no borrar: conserva draftItemId de los borradores ya generados.
  if (rows.length) {
    await db.insert(ingestMatches).values(rows).onConflictDoUpdate({
      target: [ingestMatches.sourceId, ingestMatches.tenantId],
      set: { applies: sql`excluded.applies`, reason: sql`excluded.reason`, updatedAt: new Date() },
    })
  }
  return rows
}
