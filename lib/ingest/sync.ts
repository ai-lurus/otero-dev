import { eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ingestSources } from '@/lib/db/schema'
import { fetchDofSummary } from './dof'
import { IngestError } from './extract'
import { fetchSiteLinks, isDofHost, type SiteLink } from './site'

export const MAX_NEW_PER_CHECK = 80

export type SiteSync = {
  site: typeof ingestSources.$inferSelect
  created: (typeof ingestSources.$inferSelect)[]
  found: number
  skipped: number
  remaining: number
}

/** Lee un sitio recurrente (DOF por sumario del día, el resto por listado o feed) y crea las publicaciones nuevas en cola. */
export async function syncSiteCore(site: typeof ingestSources.$inferSelect, createdBy: string, day: string): Promise<SiteSync> {
  const dof = isDofHost(new URL(site.url!).hostname)
  const notes: SiteLink[] = dof ? await fetchDofSummary(day) : (await fetchSiteLinks(site.url!, site.linkFilter)).links

  const known = notes.length
    ? await db.select({ url: ingestSources.url }).from(ingestSources).where(inArray(ingestSources.url, notes.map(n => n.url)))
    : []
  const knownUrls = new Set(known.map(k => k.url))
  const fresh = notes.filter(n => !knownUrls.has(n.url))
  const toCreate = fresh.slice(0, MAX_NEW_PER_CHECK)

  const created = toCreate.length
    ? await db.insert(ingestSources).values(toCreate.map(n => ({
        id: `src-${crypto.randomUUID()}`,
        kind: 'url',
        title: n.title,
        url: n.url,
        parentId: site.id,
        createdBy,
      }))).returning()
    : []
  const [updated] = await db.update(ingestSources)
    .set({ lastCheckedAt: new Date(), updatedAt: new Date() })
    .where(eq(ingestSources.id, site.id)).returning()
  return { site: updated, created, found: notes.length, skipped: notes.length - fresh.length, remaining: fresh.length - toCreate.length }
}

export { IngestError }
