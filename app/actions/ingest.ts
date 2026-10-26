'use server'

import { del } from '@vercel/blob'
import { and, desc, eq, inArray, lt, ne, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { ingestMatches, ingestSources, user } from '@/lib/db/schema'
import { computeMatches } from '@/lib/ingest/matching'
import { requireAdmin } from './auth-helpers'
import { DOF_HOSTS, DOF_ORIGIN, fetchDofSummary, todayInMexico } from '@/lib/ingest/dof'
import { autoUrlTitle } from '@/lib/ingest/title'
import { categorize } from '@/lib/ingest/categorize'
import { extractFromBlob, extractFromUrl, IngestError } from '@/lib/ingest/extract'

// matchCount = clientes a los que aplica (null si aún no se calcula).
export type IngestSourceRow = typeof ingestSources.$inferSelect & { createdByName: string | null; matchCount?: number | null }

export async function getIngestSources(): Promise<IngestSourceRow[]> {
  await requireAdmin()
  const rows = await db
    .select({ source: ingestSources, createdByName: user.name })
    .from(ingestSources)
    .leftJoin(user, eq(user.id, ingestSources.createdBy))
    .orderBy(desc(ingestSources.createdAt))
  const counts = await db
    .select({ sourceId: ingestMatches.sourceId, n: sql<number>`count(*) filter (where ${ingestMatches.applies})::int` })
    .from(ingestMatches).groupBy(ingestMatches.sourceId)
  const byId = new Map(counts.map(c => [c.sourceId, c.n]))
  return rows.map(r => ({ ...r.source, createdByName: r.createdByName, matchCount: byId.get(r.source.id) ?? null }))
}

function normalizeUrl(raw: string): URL | null {
  const value = raw.trim()
  if (!value) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    url.hash = ''
    return url
  } catch {
    return null
  }
}

export async function addUrlSource(data: { url: string; title?: string }): Promise<
  { ok: true; source: IngestSourceRow } | { ok: false; error: string }
> {
  const userId = await requireAdmin()
  const url = normalizeUrl(data.url)
  if (!url) return { ok: false, error: 'Escribe una URL válida que empiece con http:// o https://' }

  const href = url.toString()
  const existing = await db.select({ id: ingestSources.id }).from(ingestSources).where(eq(ingestSources.url, href)).limit(1)
  if (existing.length) return { ok: false, error: 'Esa URL ya está en la lista de fuentes' }

  const title = data.title?.trim().slice(0, 200) || autoUrlTitle(url)
  const [row] = await db.insert(ingestSources).values({
    id: `src-${crypto.randomUUID()}`,
    kind: 'url',
    title,
    url: href,
    createdBy: userId,
  }).returning()
  revalidatePath('/admin/ingesta')
  const [me] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1)
  return { ok: true, source: { ...row, createdByName: me?.name ?? null } }
}

export async function deleteIngestSource(id: string) {
  await requireAdmin()
  const [row] = await db.delete(ingestSources).where(eq(ingestSources.id, id)).returning()
  if (row?.blobPathname) {
    // El registro ya no existe; si el blob no se puede borrar solo queda huérfano.
    await del(row.blobPathname).catch(() => {})
  }
  revalidatePath('/admin/ingesta')
}

function isAutoTitle(s: typeof ingestSources.$inferSelect) {
  if (s.kind === 'file') return s.title === s.fileName?.slice(0, 200)
  return s.title === autoUrlTitle(new URL(s.url!))
}

// Una fuente por vez: el plan free de Vercel limita la duración de la función.
// Un "procesando" de hace más de 5 minutos se considera atorado y se puede reintentar.
const STUCK_AFTER_MS = 5 * 60 * 1000

export async function processSource(id: string): Promise<
  { ok: true; source: IngestSourceRow } | { ok: false; error: string }
> {
  await requireAdmin()

  const [claimed] = await db.update(ingestSources)
    .set({ status: 'procesando', statusDetail: null, updatedAt: new Date() })
    .where(and(
      eq(ingestSources.id, id),
      ne(ingestSources.kind, 'site'),
      or(ne(ingestSources.status, 'procesando'), lt(ingestSources.updatedAt, new Date(Date.now() - STUCK_AFTER_MS))),
    ))
    .returning()
  if (!claimed) return { ok: false, error: 'La fuente no existe o ya se está procesando' }

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

  revalidatePath('/admin/ingesta')
  const [row] = await db
    .select({ source: ingestSources, createdByName: user.name })
    .from(ingestSources)
    .leftJoin(user, eq(user.id, ingestSources.createdBy))
    .where(eq(ingestSources.id, id))
    .limit(1)
  const [{ n }] = await db
    .select({ n: sql<number>`count(*) filter (where ${ingestMatches.applies})::int` })
    .from(ingestMatches).where(eq(ingestMatches.sourceId, id))
  const hasMatches = (await db.select({ t: ingestMatches.tenantId }).from(ingestMatches).where(eq(ingestMatches.sourceId, id)).limit(1)).length > 0
  return { ok: true, source: { ...row.source, createdByName: row.createdByName, matchCount: hasMatches ? n : null } }
}

// ── Sitios recurrentes (por ahora solo el DOF) ─────────────────────

const DOF_TITLE = 'Diario Oficial de la Federación'
const MAX_NEW_PER_CHECK = 80

export async function addSiteSource(data: { url: string }): Promise<
  { ok: true; source: IngestSourceRow } | { ok: false; error: string }
> {
  const userId = await requireAdmin()
  const url = normalizeUrl(data.url)
  if (!url || !DOF_HOSTS.includes(url.hostname)) {
    return { ok: false, error: 'Por ahora solo se puede registrar el Diario Oficial (dof.gob.mx) como sitio recurrente' }
  }
  const existing = await db.select({ id: ingestSources.id }).from(ingestSources).where(eq(ingestSources.kind, 'site')).limit(1)
  if (existing.length) return { ok: false, error: 'El Diario Oficial ya está registrado como sitio recurrente' }

  const [row] = await db.insert(ingestSources).values({
    id: `src-${crypto.randomUUID()}`,
    kind: 'site',
    title: DOF_TITLE,
    url: `${DOF_ORIGIN}/`,
    status: 'lista',
    createdBy: userId,
  }).returning()
  revalidatePath('/admin/ingesta')
  const [me] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1)
  return { ok: true, source: { ...row, createdByName: me?.name ?? null } }
}

export async function checkSite(id: string, date?: string): Promise<
  { ok: true; site: IngestSourceRow; created: IngestSourceRow[]; found: number; skipped: number; remaining: number }
  | { ok: false; error: string }
> {
  const userId = await requireAdmin()
  const [site] = await db.select().from(ingestSources).where(and(eq(ingestSources.id, id), eq(ingestSources.kind, 'site'))).limit(1)
  if (!site) return { ok: false, error: 'El sitio no existe' }
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayInMexico()

  let notes
  try {
    notes = await fetchDofSummary(day)
  } catch (e) {
    if (e instanceof IngestError) return { ok: false, error: e.message }
    console.error('checkSite', id, e)
    return { ok: false, error: 'No se pudo leer el sumario del Diario Oficial' }
  }

  const known = await db.select({ url: ingestSources.url }).from(ingestSources)
    .where(inArray(ingestSources.url, notes.map(n => n.url)))
  const knownUrls = new Set(known.map(k => k.url))
  const fresh = notes.filter(n => !knownUrls.has(n.url))
  const toCreate = fresh.slice(0, MAX_NEW_PER_CHECK)

  const inserted = toCreate.length
    ? await db.insert(ingestSources).values(toCreate.map(n => ({
        id: `src-${crypto.randomUUID()}`,
        kind: 'url',
        title: n.title,
        url: n.url,
        parentId: site.id,
        createdBy: userId,
      }))).returning()
    : []
  const [updatedSite] = await db.update(ingestSources)
    .set({ lastCheckedAt: new Date(), updatedAt: new Date() })
    .where(eq(ingestSources.id, site.id)).returning()
  revalidatePath('/admin/ingesta')

  const [me] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId)).limit(1)
  const withName = (r: typeof ingestSources.$inferSelect) => ({ ...r, createdByName: me?.name ?? null })
  return {
    ok: true,
    site: withName(updatedSite),
    created: inserted.map(withName),
    found: notes.length,
    skipped: notes.length - fresh.length,
    remaining: fresh.length - toCreate.length,
  }
}
