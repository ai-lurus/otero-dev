'use server'

import { del } from '@vercel/blob'
import { desc, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { ingestSources, user } from '@/lib/db/schema'
import { requireAdmin } from './auth-helpers'

export type IngestSourceRow = typeof ingestSources.$inferSelect & { createdByName: string | null }

export async function getIngestSources(): Promise<IngestSourceRow[]> {
  await requireAdmin()
  const rows = await db
    .select({ source: ingestSources, createdByName: user.name })
    .from(ingestSources)
    .leftJoin(user, eq(user.id, ingestSources.createdBy))
    .orderBy(desc(ingestSources.createdAt))
  return rows.map(r => ({ ...r.source, createdByName: r.createdByName }))
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

  const title = data.title?.trim().slice(0, 200) || `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
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
