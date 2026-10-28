import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/db/tenant'
import { companyProfiles, ingestMatches, ingestSources, regulatoryItemEvents, regulatoryItems, type IngestSource, type Tenant } from '@/lib/db/schema'
import { draftObligation, ITEM_MATERIA, type Company, type Draft } from './draft'
import { isDofHost } from './site'
import type { Materia } from './categories'

// De una publicación categorizada al asunto de un cliente, en su propia base.
// Lo usan el botón manual del panel de ingesta (borrador sin enviar) y el sync
// programado de RegWatch (el asunto queda visible para el cliente).

export const INGEST_EVENT = 'created_from_ingest'

export type CreatedItem = { itemId: string; aiDraft: boolean; existing: boolean }

async function existingItemId(tdb: Awaited<ReturnType<typeof getTenantDb>>, tenantId: string, sourceId: string) {
  const [row] = await tdb.select({ itemId: regulatoryItemEvents.itemId }).from(regulatoryItemEvents).where(and(
    eq(regulatoryItemEvents.tenantId, tenantId),
    eq(regulatoryItemEvents.eventType, INGEST_EVENT),
    sql`${regulatoryItemEvents.metadata}->>'ingestSourceId' = ${sourceId}`,
  )).limit(1)
  return row?.itemId ?? null
}

/** Origen de una publicación de sitio recurrente: DOF o el nombre con que se registró el sitio. */
export async function sourceLabelOf(source: IngestSource) {
  if (!source.parentId) return 'Sitio recurrente'
  const [parent] = await db.select({ title: ingestSources.title, url: ingestSources.url }).from(ingestSources).where(eq(ingestSources.id, source.parentId)).limit(1)
  if (!parent) return 'Sitio recurrente'
  return parent.url && isDofHost(new URL(parent.url).hostname) ? 'DOF' : parent.title.slice(0, 80)
}

export async function createItemFromSource(args: {
  source: IngestSource
  sourceLabel: string
  tenant: Tenant
  actorId: string
  /** true: el asunto queda visible para el cliente al crearse (RegWatch automático). */
  send: boolean
}): Promise<CreatedItem> {
  const { source, sourceLabel, tenant, actorId, send } = args
  const tdb = await getTenantDb(tenant.id)
  const existing = await existingItemId(tdb, tenant.id, source.id)
  if (existing) return { itemId: existing, aiDraft: false, existing: true }

  const [profile] = await tdb.select().from(companyProfiles).where(eq(companyProfiles.tenantId, tenant.id)).limit(1)
  const company: Company = { name: tenant.name, ...profile, industry: profile?.industry || tenant.industry }
  let draft: Draft | null = null
  try {
    draft = await draftObligation(source, company)
  } catch (e) {
    // Sin IA queda el asunto con el resumen de la publicación.
    console.error('draftObligation', tenant.id, e)
  }

  const itemId = crypto.randomUUID()
  await tdb.insert(regulatoryItems).values({
    id: itemId,
    tenantId: tenant.id,
    scope: 'regulatorio',
    origin: 'regwatch',
    objects: source.objects ?? [],
    materia: ITEM_MATERIA[(source.materia ?? 'otra') as Materia] ?? 'Administrativo y simplificación',
    title: draft?.title ?? source.title.slice(0, 150),
    description: source.summary ?? '',
    instrumentType: draft?.instrumentType ?? null,
    authority: source.authority,
    source: source.parentId ? sourceLabel : source.kind === 'file' ? (source.fileName ?? 'Archivo') : new URL(source.url!).hostname,
    sourceUrl: source.url,
    stage: source.vigenciaStatus === 'proyecto' ? 'proyecto' : source.parentId ? 'publicado' : null,
    stageDetail: source.vigenciaDetail,
    publishedAt: source.publishedAt,
    dueDate: draft?.dueDate ?? null,
    impact: draft?.impact ?? null,
    impactDirection: draft?.impactDirection ?? null,
    impactRationale: draft?.impactRationale ?? '',
    generatesObligation: draft?.generatesObligation ?? false,
    obligationDetail: draft?.obligationDetail ?? '',
    comments: send ? '' : 'Borrador generado desde la ingesta. Revísalo antes de enviarlo al cliente.',
    sentAt: send ? new Date() : null,
    createdBy: actorId,
  })
  await tdb.insert(regulatoryItemEvents).values({
    id: crypto.randomUUID(),
    itemId,
    tenantId: tenant.id,
    eventType: INGEST_EVENT,
    title: 'Asunto identificado desde la ingesta',
    description: draft ? 'Otero propuso el asunto a partir de la publicación y el perfil de la empresa.' : 'Se abrió el expediente con el resumen de la publicación.',
    metadata: { ingestSourceId: source.id, aiDraft: Boolean(draft) },
    createdBy: actorId,
  })
  await db.insert(ingestMatches)
    .values({ sourceId: source.id, tenantId: tenant.id, applies: true, reason: send ? 'Generado automáticamente' : 'Generado manualmente', draftItemId: itemId })
    .onConflictDoUpdate({ target: [ingestMatches.sourceId, ingestMatches.tenantId], set: { draftItemId: itemId, updatedAt: new Date() } })
  return { itemId, aiDraft: Boolean(draft), existing: false }
}
