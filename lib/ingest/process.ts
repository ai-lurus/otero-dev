import { and, eq, lt, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ingestSources } from '@/lib/db/schema'
import { categorize } from './categorize'
import { extractFromBlob, extractFromUrl, IngestError } from './extract'
import { computeMatches } from './matching'
import { autoUrlTitle } from './title'

function isAutoTitle(s: typeof ingestSources.$inferSelect) {
  if (s.kind === 'file') return s.title === s.fileName?.slice(0, 200)
  return s.title === autoUrlTitle(new URL(s.url!))
}

// Un "procesando" de hace más de 5 minutos se considera atorado y se puede reintentar.
const STUCK_AFTER_MS = 5 * 60 * 1000

/** Extrae, categoriza y calcula a qué clientes aplica una fuente. Devuelve false si no se pudo tomar. */
export async function processSourceCore(id: string): Promise<boolean> {
  const [claimed] = await db.update(ingestSources)
    .set({ status: 'procesando', statusDetail: null, updatedAt: new Date() })
    .where(and(
      eq(ingestSources.id, id),
      ne(ingestSources.kind, 'site'),
      or(ne(ingestSources.status, 'procesando'), lt(ingestSources.updatedAt, new Date(Date.now() - STUCK_AFTER_MS))),
    ))
    .returning()
  if (!claimed) return false

  try {
    const content = claimed.kind === 'url'
      ? await extractFromUrl(claimed.url!)
      : await extractFromBlob(claimed.blobPathname!, claimed.mimeType)
    const result = await categorize(content, claimed.title)
    await db.update(ingestSources).set({
      status: 'lista',
      statusDetail: null,
      // Solo reemplaza el título si es el automático (dominio/ruta o nombre del archivo).
      title: isAutoTitle(claimed) ? result.title : claimed.title,
      materia: result.materia,
      authority: result.authority,
      publishedAt: result.publishedAt,
      vigenciaStatus: result.vigenciaStatus,
      vigenciaDetail: result.vigenciaDetail,
      summary: result.summary,
      objects: result.objects,
      objeto: result.objeto,
      considerations: result.considerations,
      ambito: result.ambito,
      effectiveDate: result.effectiveDate,
      commentDeadline: result.commentDeadline,
      isAnnouncement: result.isAnnouncement,
      legalBases: result.legalBases,
      genus: result.genus,
      processedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(ingestSources.id, id))
    // Propuesta de clientes; si falla, se recalcula al abrir el detalle.
    await computeMatches({ id, materia: result.materia }).catch(e => console.error('computeMatches', id, e))
  } catch (e) {
    const message = e instanceof IngestError ? e.message : 'Ocurrió un error inesperado al procesar'
    if (!(e instanceof IngestError)) console.error('processSource', id, e)
    await db.update(ingestSources)
      .set({ status: 'error', statusDetail: message, updatedAt: new Date() })
      .where(eq(ingestSources.id, id))
  }
  return true
}
