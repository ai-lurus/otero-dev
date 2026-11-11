import { eq } from 'drizzle-orm'
import type { getTenantDb } from '@/lib/db/tenant'
import { documents } from '@/lib/db/schema'
import type { Triggers } from '@/lib/monitoring-profile'
import { documentTriggers } from './analysis'

type TenantDb = Awaited<ReturnType<typeof getTenantDb>>

/** Respuestas a las preguntas del perfil que demuestran los documentos confirmados del cliente. */
export async function loadDocumentTriggers(tdb: TenantDb, tenantId: string): Promise<Triggers> {
  const rows = await tdb
    .select({ analysis: documents.analysis, analysisStatus: documents.analysisStatus })
    .from(documents)
    .where(eq(documents.tenantId, tenantId))
  return documentTriggers(rows)
}
