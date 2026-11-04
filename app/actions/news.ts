'use server'

import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/db/tenant'
import {
  companyProfiles, newsItems, newsSources, regulatoryItemEvents, regulatoryItems, tenants, userTenants,
} from '@/lib/db/schema'
import { draftObligation, ITEM_MATERIA, type Company, type Draft } from '@/lib/ingest/draft'
import { matchTenant } from '@/lib/ingest/match'
import { MATERIAS, type Materia } from '@/lib/ingest/categories'
import { getSession, requireAdmin } from './auth-helpers'

// Noticias: el boletín de comunicados de dependencias que ven los clientes y
// el asunto que su admin puede abrir desde cada nota. Las notas son del
// despacho (base principal); el asunto vive en la base del cliente.

const NEWS_EVENT = 'created_from_news'
const BULLETIN_DAYS = 30
const BULLETIN_LIMIT = 150

export type NewsCard = {
  id: string
  title: string
  summary: string | null
  url: string
  imageUrl: string | null
  publishedAt: string
  source: string
  authority: string
  materia: string
  materiaLabel: string
  /** Por qué aplica a esta empresa según su perfil; null si no aplica. */
  reason: string | null
  /** Id del asunto que ya se abrió desde esta nota, si existe. */
  itemId: string | null
}

async function clientContext() {
  const session = await getSession()
  if (!session?.user) throw new Error('Unauthorized')
  const rows = await db.select().from(userTenants).where(eq(userTenants.userId, session.user.id))
  const m = rows.find(r => r.role === 'tenant_admin') ?? rows.find(r => r.role === 'client')
  if (!m) throw new Error('Forbidden')
  return { userId: session.user.id, tenantId: m.tenantId, canCreate: m.role === 'tenant_admin' }
}

async function profileOf(tenantId: string) {
  const tdb = await getTenantDb(tenantId)
  const [profile] = await tdb.select().from(companyProfiles).where(eq(companyProfiles.tenantId, tenantId)).limit(1)
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (!tenant) throw new Error('Cliente no encontrado')
  return { tdb, tenant, profile, matchProfile: { ...profile, industry: [tenant.industry, profile?.industry].filter(Boolean).join(' ') } }
}

/** Notas ya convertidas en asunto por este cliente: id de nota -> id de asunto. */
async function createdItems(tdb: Awaited<ReturnType<typeof getTenantDb>>, tenantId: string) {
  const rows = await tdb.select({ itemId: regulatoryItemEvents.itemId, newsId: sql<string>`${regulatoryItemEvents.metadata}->>'newsItemId'` })
    .from(regulatoryItemEvents)
    .where(and(eq(regulatoryItemEvents.tenantId, tenantId), eq(regulatoryItemEvents.eventType, NEWS_EVENT)))
  return new Map(rows.map(r => [r.newsId, r.itemId]))
}

function toCard(
  item: typeof newsItems.$inferSelect,
  source: typeof newsSources.$inferSelect,
  matchProfile: Parameters<typeof matchTenant>[1],
  created: Map<string, string>,
): NewsCard {
  const match = matchTenant(item.materia, matchProfile)
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    url: item.url,
    imageUrl: item.imageUrl,
    publishedAt: (item.publishedAt ?? item.createdAt).toISOString(),
    source: source.shortName,
    authority: source.name,
    materia: item.materia,
    materiaLabel: MATERIAS[item.materia as Materia] ?? 'Otra',
    reason: match.applies ? match.reason : null,
    itemId: created.get(item.id) ?? null,
  }
}

/** Una nota del boletín con lo mismo que ve la lista; null si no existe o el despacho la quitó. */
export async function getNewsDetail(id: string): Promise<{ card: NewsCard; canCreate: boolean } | null> {
  const { tenantId, canCreate } = await clientContext()
  const [row, ctx] = await Promise.all([
    db.select({ item: newsItems, source: newsSources })
      .from(newsItems).innerJoin(newsSources, eq(newsSources.id, newsItems.sourceId))
      .where(and(eq(newsItems.id, id), eq(newsItems.hidden, false))).limit(1),
    profileOf(tenantId),
  ])
  if (!row[0]) return null
  const created = await createdItems(ctx.tdb, tenantId).catch(() => new Map<string, string>())
  return { card: toCard(row[0].item, row[0].source, ctx.matchProfile, created), canCreate }
}

/** Boletín del cliente: notas de los últimos 30 días, con el motivo por el que aplican según su perfil. */
export async function getNewsBulletin(): Promise<{ cards: NewsCard[]; canCreate: boolean }> {
  const { tenantId, canCreate } = await clientContext()
  const since = new Date(Date.now() - BULLETIN_DAYS * 86_400_000)
  const [rows, ctx] = await Promise.all([
    db.select({ item: newsItems, source: newsSources })
      .from(newsItems)
      .innerJoin(newsSources, eq(newsSources.id, newsItems.sourceId))
      .where(and(eq(newsItems.hidden, false), eq(newsSources.active, true), gte(sql`coalesce(${newsItems.publishedAt}, ${newsItems.createdAt})`, since)))
      .orderBy(desc(sql`coalesce(${newsItems.publishedAt}, ${newsItems.createdAt})`))
      .limit(BULLETIN_LIMIT),
    profileOf(tenantId),
  ])
  const created = await createdItems(ctx.tdb, tenantId).catch(() => new Map<string, string>())
  const cards = rows.map(({ item, source }) => toCard(item, source, ctx.matchProfile, created))
  return { cards, canCreate }
}

function draftOrNull(news: typeof newsItems.$inferSelect, source: typeof newsSources.$inferSelect, company: Company): Promise<Draft | null> {
  return draftObligation({
    title: news.title,
    authority: source.name,
    publishedAt: (news.publishedAt ?? news.createdAt).toISOString().slice(0, 10),
    vigenciaStatus: null,
    vigenciaDetail: null,
    summary: news.summary,
    instrumentType: null,
    isAnnouncement: true,
  }, company).catch((e) => {
    console.error('news draft', e)
    return null
  })
}

/** Abre un asunto en la base del cliente a partir de una nota. Solo el admin del cliente. */
export async function createItemFromNews(newsId: string): Promise<{ itemId: string; existing: boolean }> {
  const { userId, tenantId, canCreate } = await clientContext()
  if (!canCreate) throw new Error('Solo el administrador de tu empresa puede abrir asuntos')
  const [row] = await db.select({ news: newsItems, source: newsSources })
    .from(newsItems).innerJoin(newsSources, eq(newsSources.id, newsItems.sourceId))
    .where(eq(newsItems.id, newsId)).limit(1)
  if (!row) throw new Error('Noticia no encontrada')
  const { news, source } = row

  const { tdb, tenant, profile } = await profileOf(tenantId)
  const existing = (await createdItems(tdb, tenantId)).get(news.id)
  if (existing) return { itemId: existing, existing: true }

  const company: Company = { name: tenant.name, ...profile, industry: profile?.industry || tenant.industry }
  const draft = await draftOrNull(news, source, company)
  const itemId = crypto.randomUUID()
  await tdb.insert(regulatoryItems).values({
    id: itemId,
    tenantId,
    scope: 'regulatorio',
    origin: 'regwatch',
    materia: ITEM_MATERIA[(news.materia as Materia) in MATERIAS ? (news.materia as Materia) : 'otra'],
    title: news.title.slice(0, 300),
    description: news.summary ?? '',
    instrumentType: draft?.instrumentType ?? null,
    authority: source.name,
    source: `${source.shortName} · comunicado`,
    sourceUrl: news.url,
    stage: 'publicado',
    publishedAt: (news.publishedAt ?? news.createdAt).toISOString().slice(0, 10),
    dueDate: draft?.dueDate ?? null,
    impact: draft?.impact ?? null,
    impactDirection: draft?.impactDirection ?? null,
    impactRationale: draft?.impactRationale ?? '',
    generatesObligation: draft?.generatesObligation ?? false,
    obligationsStatus: draft?.obligationsStatus ?? 'por_definir',
    obligationDetail: draft?.obligationDetail ?? '',
    legalBases: [],
    comments: 'Asunto abierto desde una noticia del boletín.',
    sentAt: new Date(),
    createdBy: userId,
  })
  await tdb.insert(regulatoryItemEvents).values({
    id: crypto.randomUUID(),
    itemId,
    tenantId,
    eventType: NEWS_EVENT,
    title: 'Asunto abierto desde una noticia',
    description: draft ? 'Otero propuso el asunto a partir del comunicado y el perfil de la empresa.' : 'Se abrió el expediente con el resumen del comunicado.',
    metadata: { newsItemId: news.id, aiDraft: Boolean(draft) },
    createdBy: userId,
  })
  revalidatePath('/cliente/noticias')
  revalidatePath('/cliente/obligaciones')
  revalidatePath(`/cliente/noticias/${news.id}`)
  return { itemId, existing: false }
}

// ── Despacho: fuentes y notas ──────────────────────────────────────

export async function getNewsSourcesAdmin() {
  await requireAdmin()
  const sources = await db.select().from(newsSources).orderBy(newsSources.kind, newsSources.name)
  const counts = await db.select({ sourceId: newsItems.sourceId, n: sql<number>`count(*)::int` }).from(newsItems).groupBy(newsItems.sourceId)
  const byId = new Map(counts.map(c => [c.sourceId, c.n]))
  return sources.map(s => ({ ...s, notes: byId.get(s.id) ?? 0 }))
}

export async function setNewsSourceActive(id: string, active: boolean) {
  await requireAdmin()
  await db.update(newsSources).set({ active, updatedAt: new Date() }).where(eq(newsSources.id, id))
  revalidatePath('/admin/noticias/fuentes')
  revalidatePath('/cliente/noticias')
}

export async function hideNewsItems(ids: string[], hidden: boolean) {
  await requireAdmin()
  if (ids.length) await db.update(newsItems).set({ hidden }).where(inArray(newsItems.id, ids))
  revalidatePath('/cliente/noticias')
}
