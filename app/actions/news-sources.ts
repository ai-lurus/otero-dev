'use server'

import { and, eq, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { newsItems, newsSources, type NewsSourceRow } from '@/lib/db/schema'
import { IngestError } from '@/lib/ingest/errors'
import { MATERIAS } from '@/lib/ingest/categories'
import { enrichPending, listNotes, syncNewsSources, type NewsRun } from '@/lib/news/sync'
import { requireAdmin } from './auth-helpers'

// Fuentes del boletín de Noticias (news_sources), que lee el cron
// /api/cron/noticias. La base es la única lista: no hay catálogo en el código.
// Mismo permiso que la ingesta de RegWatch: admin del despacho.

const PANEL = '/admin/noticias/fuentes'
/** Tiempo que "Leer ahora" dedica a abrir las notas nuevas para sacar su entrada. */
const READ_ENRICH_MS = 20_000

export type NewsSourceAdminRow = NewsSourceRow & {
  notes: number
  lastNoteAt: Date | null
}

export type NewsSourceInput = {
  name: string
  shortName: string
  url: string
  linkFilter?: string
  kind: string
  parent?: string
  materia: string
}

type Clean = Omit<NewsSourceInput, 'linkFilter' | 'parent'> & { linkFilter: string | null; parent: string | null }
type Result<T> = { ok: true } & T | { ok: false; error: string }

function revalidate() {
  revalidatePath(PANEL)
  revalidatePath('/admin/noticias')
  revalidatePath('/cliente/noticias')
}

function normalizeUrl(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

function clean(data: NewsSourceInput): { ok: true; value: Clean } | { ok: false; error: string } {
  const url = normalizeUrl(data.url ?? '')
  if (!url) return { ok: false, error: 'Escribe la URL del listado de comunicados (https://…)' }
  const name = data.name?.trim().slice(0, 160)
  if (!name) return { ok: false, error: 'Escribe el nombre de la dependencia o institución' }
  const shortName = data.shortName?.trim().slice(0, 40)
  if (!shortName) return { ok: false, error: 'Escribe el nombre corto que va en la cita, p. ej. SEMARNAT' }
  if (data.kind !== 'dependencia' && data.kind !== 'institucion') return { ok: false, error: 'Elige si es dependencia o institución' }
  if (!(data.materia in MATERIAS)) return { ok: false, error: 'Elige la materia' }
  return {
    ok: true,
    value: {
      name,
      shortName,
      url,
      kind: data.kind,
      materia: data.materia,
      linkFilter: data.linkFilter?.trim().slice(0, 200) || null,
      parent: data.parent?.trim().slice(0, 160) || null,
    },
  }
}

async function urlTaken(url: string, exceptId?: string) {
  const rows = await db.select({ id: newsSources.id }).from(newsSources)
    .where(exceptId ? and(eq(newsSources.url, url), ne(newsSources.id, exceptId)) : eq(newsSources.url, url)).limit(1)
  return rows.length > 0
}

/** Slug estable a partir del nombre corto, con el formato de las existentes ("semarnat"). */
async function newId(shortName: string) {
  const base = shortName.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'fuente'
  const taken = new Set((await db.select({ id: newsSources.id }).from(newsSources)).map(r => r.id))
  if (!taken.has(base)) return base
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
}

async function withStats(rows: NewsSourceRow[]): Promise<NewsSourceAdminRow[]> {
  const stats = await db.select({
    sourceId: newsItems.sourceId,
    n: sql<number>`count(*)::int`,
    last: sql<Date | null>`max(coalesce(${newsItems.publishedAt}, ${newsItems.createdAt}))`,
  }).from(newsItems).groupBy(newsItems.sourceId)
  const byId = new Map(stats.map(s => [s.sourceId, s]))
  return rows.map(s => {
    const st = byId.get(s.id)
    return { ...s, notes: st?.n ?? 0, lastNoteAt: st?.last ? new Date(st.last) : null }
  })
}

async function oneRow(id: string): Promise<NewsSourceAdminRow | null> {
  const rows = await db.select().from(newsSources).where(eq(newsSources.id, id)).limit(1)
  if (!rows.length) return null
  const [row] = await withStats(rows)
  return row
}

export async function getNewsSourcesAdmin(): Promise<NewsSourceAdminRow[]> {
  await requireAdmin()
  const sources = await db.select().from(newsSources).orderBy(newsSources.kind, newsSources.name)
  return withStats(sources)
}

/** Prueba un listado antes de guardarlo: cuántas notas tomaría y las primeras. */
export async function previewNewsSource(data: { url: string; linkFilter?: string }): Promise<
  Result<{ total: number; sample: { url: string; title: string; publishedAt: string | null }[] }>
> {
  await requireAdmin()
  const url = normalizeUrl(data.url ?? '')
  if (!url) return { ok: false, error: 'Escribe la URL del listado de comunicados (https://…)' }
  try {
    const notes = await listNotes({ url, linkFilter: data.linkFilter?.trim() || null })
    return {
      ok: true,
      total: notes.length,
      sample: notes.slice(0, 8).map(n => ({ url: n.url, title: n.title, publishedAt: n.publishedAt?.toISOString() ?? null })),
    }
  } catch (e) {
    if (e instanceof IngestError) return { ok: false, error: e.message }
    console.error('previewNewsSource', e)
    return { ok: false, error: 'No se pudo leer esa página' }
  }
}

export async function addNewsSource(data: NewsSourceInput): Promise<Result<{ source: NewsSourceAdminRow }>> {
  await requireAdmin()
  const input = clean(data)
  if (!input.ok) return input
  if (await urlTaken(input.value.url)) return { ok: false, error: 'Ese listado ya está en las fuentes del boletín' }
  const id = await newId(input.value.shortName)
  await db.insert(newsSources).values({ id, ...input.value, active: true })
  revalidate()
  const source = await oneRow(id)
  return source ? { ok: true, source } : { ok: false, error: 'No se pudo guardar la fuente' }
}

export async function updateNewsSource(id: string, data: NewsSourceInput): Promise<Result<{ source: NewsSourceAdminRow }>> {
  await requireAdmin()
  const input = clean(data)
  if (!input.ok) return input
  const [current] = await db.select().from(newsSources).where(eq(newsSources.id, id)).limit(1)
  if (!current) return { ok: false, error: 'La fuente ya no existe' }
  if (await urlTaken(input.value.url, id)) return { ok: false, error: 'Otra fuente ya usa ese listado' }
  // Si cambia lo que se lee, el último resultado ya no describe la fuente.
  const readChanged = current.url !== input.value.url || current.linkFilter !== input.value.linkFilter
  await db.update(newsSources).set({
    ...input.value,
    ...(readChanged ? { lastError: null, lastCheckedAt: null } : {}),
    updatedAt: new Date(),
  }).where(eq(newsSources.id, id))
  revalidate()
  const source = await oneRow(id)
  return source ? { ok: true, source } : { ok: false, error: 'No se pudo guardar la fuente' }
}

export async function setNewsSourceActive(id: string, active: boolean) {
  await requireAdmin()
  await db.update(newsSources).set({ active, updatedAt: new Date() }).where(eq(newsSources.id, id))
  revalidate()
}

/** Borra una fuente y sus notas. Los asuntos que los clientes abrieron desde ellas viven en su base y se conservan. */
export async function deleteNewsSource(id: string): Promise<Result<object>> {
  await requireAdmin()
  await db.delete(newsItems).where(eq(newsItems.sourceId, id))
  await db.delete(newsSources).where(eq(newsSources.id, id))
  revalidate()
  return { ok: true }
}

/** Lee una fuente ahora (aunque esté pausada), guarda las notas nuevas y abre las que alcance el tiempo. */
export async function readNewsSource(id: string): Promise<Result<{ source: NewsSourceAdminRow; newItems: number; failed: boolean }>> {
  await requireAdmin()
  const run: NewsRun = { sources: 0, newItems: 0, enriched: 0, failed: 0, remaining: false }
  await syncNewsSources(run, id)
  if (!run.sources) return { ok: false, error: 'La fuente ya no existe' }
  if (run.newItems) await enrichPending(run, Date.now() + READ_ENRICH_MS)
  revalidate()
  const source = await oneRow(id)
  if (!source) return { ok: false, error: 'La fuente ya no existe' }
  return { ok: true, source, newItems: run.newItems, failed: Boolean(source.lastError) }
}
