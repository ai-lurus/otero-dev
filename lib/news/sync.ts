import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { newsItems, newsSources, type NewsSourceRow } from '@/lib/db/schema'
import { decodeBody, fetchRemote, readCapped } from '@/lib/ingest/extract'
import { IngestError } from '@/lib/ingest/errors'
import { fetchSiteLinks, filterToRegExp } from '@/lib/ingest/site'
import { NEWS_CATALOG } from './catalog'
import { classifyMateria, displayTitle, parseArticle, parseGobMxListing, type ListedNote } from './parse'

// Sync de Noticias: lee las salas de prensa activas, guarda las notas nuevas
// y luego abre cada nota para sacar su entrada. Sin IA. Lo llama el cron
// (app/api/cron/noticias) dentro de un presupuesto de tiempo; es idempotente.

const MAX_PAGE_BYTES = 5 * 1024 * 1024
/** Notas nuevas que se toman por fuente y corrida (el listado trae las más recientes primero). */
const MAX_NEW_PER_SOURCE = 12
const PARALLEL = 6

export type NewsRun = { sources: number; newItems: number; enriched: number; failed: number; remaining: boolean }

/** Da de alta las fuentes del catálogo que falten. No toca las existentes (el despacho pudo pausarlas). */
export async function ensureCatalog() {
  await db.insert(newsSources).values(NEWS_CATALOG.map(s => ({ ...s, active: s.active ?? true }))).onConflictDoNothing({ target: newsSources.id })
}

async function fetchHtml(url: string) {
  const res = await fetchRemote(url)
  const html = decodeBody(await readCapped(res.body, MAX_PAGE_BYTES), res.headers.get('content-type') ?? '')
  return { html, finalUrl: new URL(res.url || url) }
}

const isGobMx = (url: string) => new URL(url).hostname === 'www.gob.mx'

async function listNotes(source: NewsSourceRow): Promise<ListedNote[]> {
  if (isGobMx(source.url)) {
    const { html, finalUrl } = await fetchHtml(source.url)
    const re = source.linkFilter ? filterToRegExp(source.linkFilter) : null
    const notes = parseGobMxListing(html, finalUrl).filter(n => !re || re.test(n.url))
    if (notes.length) return notes
    // Algunas secciones de gob.mx no usan el listado de prensa: se cae al lector genérico.
  }
  const { links } = await fetchSiteLinks(source.url, source.linkFilter)
  return links
    .filter(l => l.title.length >= 15)
    .map(l => ({ url: l.url, title: l.title, publishedAt: null, imageUrl: null }))
}

async function syncSource(source: NewsSourceRow): Promise<number> {
  try {
    const notes = (await listNotes(source)).slice(0, 40)
    const known = notes.length
      ? await db.select({ url: newsItems.url }).from(newsItems).where(inArray(newsItems.url, notes.map(n => n.url)))
      : []
    const knownUrls = new Set(known.map(k => k.url))
    const fresh = notes.filter(n => !knownUrls.has(n.url)).slice(0, MAX_NEW_PER_SOURCE)
    if (fresh.length) {
      await db.insert(newsItems).values(fresh.map(n => ({
        id: `news-${crypto.randomUUID()}`,
        sourceId: source.id,
        url: n.url,
        title: n.title,
        imageUrl: n.imageUrl,
        publishedAt: n.publishedAt,
        materia: classifyMateria(source.materia, n.title, null),
      }))).onConflictDoNothing({ target: newsItems.url })
    }
    await db.update(newsSources).set({ lastCheckedAt: new Date(), lastError: null, updatedAt: new Date() }).where(eq(newsSources.id, source.id))
    return fresh.length
  } catch (e) {
    const message = e instanceof IngestError ? e.message : 'No se pudo leer la sala de prensa'
    if (!(e instanceof IngestError)) console.error('news sync', source.id, e)
    await db.update(newsSources).set({ lastCheckedAt: new Date(), lastError: message, updatedAt: new Date() }).where(eq(newsSources.id, source.id))
    throw e
  }
}

async function inChunks<T>(list: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < list.length; i += size) await Promise.all(list.slice(i, i + size).map(fn))
}

/** Lee una o todas las fuentes activas y guarda las notas nuevas. */
export async function syncNewsSources(run: NewsRun, onlyId?: string) {
  const sources = await db.select().from(newsSources)
    .where(onlyId ? eq(newsSources.id, onlyId) : eq(newsSources.active, true))
  await inChunks(sources, PARALLEL, async (source) => {
    run.sources += 1
    try {
      const created = await syncSource(source)
      run.newItems += created
    } catch { run.failed += 1 }
  })
}

async function enrichOne(item: typeof newsItems.$inferSelect, sourceMateria: string) {
  try {
    const { html } = await fetchHtml(item.url)
    const art = parseArticle(html)
    const title = displayTitle(item.title, art.title, art.summary)
    await db.update(newsItems).set({
      title,
      summary: art.summary,
      publishedAt: item.publishedAt ?? art.publishedAt,
      imageUrl: item.imageUrl ?? art.imageUrl,
      materia: classifyMateria(sourceMateria, title, art.summary),
      enrichedAt: new Date(),
    }).where(eq(newsItems.id, item.id))
    return true
  } catch (e) {
    // Se marca igual para no reintentar sin fin: la nota queda con su título y enlace.
    if (!(e instanceof IngestError)) console.error('news enrich', item.id, e)
    await db.update(newsItems).set({ enrichedAt: new Date() }).where(eq(newsItems.id, item.id))
    return false
  }
}

/** Abre las notas sin entrada, de la más reciente a la más vieja, hasta agotar el tiempo. */
export async function enrichPending(run: NewsRun, deadline: number) {
  while (Date.now() < deadline) {
    const batch = await db.select({ item: newsItems, materia: newsSources.materia })
      .from(newsItems)
      .innerJoin(newsSources, eq(newsSources.id, newsItems.sourceId))
      .where(and(isNull(newsItems.enrichedAt)))
      .orderBy(desc(newsItems.createdAt))
      .limit(PARALLEL)
    if (!batch.length) return
    const results = await Promise.all(batch.map(r => enrichOne(r.item, r.materia)))
    run.enriched += results.filter(Boolean).length
    run.failed += results.filter(r => !r).length
  }
}

export async function runNews(opts: { budgetMs: number; syncSources: boolean }): Promise<NewsRun> {
  const deadline = Date.now() + opts.budgetMs
  const run: NewsRun = { sources: 0, newItems: 0, enriched: 0, failed: 0, remaining: false }
  if (opts.syncSources) {
    await ensureCatalog()
    await syncNewsSources(run)
  }
  await enrichPending(run, deadline)
  const [left] = await db.select({ id: newsItems.id }).from(newsItems).where(isNull(newsItems.enrichedAt)).limit(1)
  run.remaining = Boolean(left)
  return run
}
