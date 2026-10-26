'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/db/tenant'
import { companyProfiles, ingestMatches, ingestSources, regulatoryItemEvents, regulatoryItems, tenants } from '@/lib/db/schema'
import { draftObligation, ITEM_MATERIA, type Company, type Draft } from '@/lib/ingest/draft'
import { computeMatches } from '@/lib/ingest/matching'
import type { Materia } from '@/lib/ingest/categories'
import { requireAdmin } from './auth-helpers'

// De una publicación ya categorizada en la ingesta a borradores de obligación
// en la base de cada cliente. Nada llega al cliente hasta que el socio lo
// envía desde la matriz regulatoria.

const EVENT = 'created_from_ingest'

export type ObligationTarget = {
  tenantId: string
  name: string
  applies: boolean
  reason: string
  itemId: string | null // borrador ya generado desde esta publicación
  error: string | null
}

async function readySource(sourceId: string) {
  const [source] = await db.select().from(ingestSources).where(eq(ingestSources.id, sourceId)).limit(1)
  if (!source || source.kind === 'site' || source.status !== 'lista') throw new Error('La fuente aún no está categorizada')
  return source
}

async function tenantContext(tenantId: string, sourceId: string) {
  const tdb = await getTenantDb(tenantId)
  const [[profile], existing] = await Promise.all([
    tdb.select().from(companyProfiles).where(eq(companyProfiles.tenantId, tenantId)).limit(1),
    tdb.select({ itemId: regulatoryItemEvents.itemId }).from(regulatoryItemEvents).where(and(
      eq(regulatoryItemEvents.tenantId, tenantId),
      eq(regulatoryItemEvents.eventType, EVENT),
      sql`${regulatoryItemEvents.metadata}->>'ingestSourceId' = ${sourceId}`,
    )).limit(1),
  ])
  return { tdb, profile: profile ?? null, itemId: existing[0]?.itemId ?? null }
}

export async function getObligationTargets(sourceId: string): Promise<ObligationTarget[]> {
  await requireAdmin()
  const source = await readySource(sourceId)
  const list = await db.select().from(tenants).orderBy(tenants.name)
  // Usa lo calculado al procesar; si falta algún cliente (fuente anterior o base caída), recalcula.
  let stored = await db.select().from(ingestMatches).where(eq(ingestMatches.sourceId, sourceId))
  if (list.some(t => !stored.some(m => m.tenantId === t.id))) {
    await computeMatches(source)
    stored = await db.select().from(ingestMatches).where(eq(ingestMatches.sourceId, sourceId))
  }
  const matches = new Map(stored.map(m => [m.tenantId, m]))
  return Promise.all(list.map(async (tenant): Promise<ObligationTarget> => {
    try {
      const { itemId } = await tenantContext(tenant.id, sourceId)
      const match = matches.get(tenant.id)
      return { tenantId: tenant.id, name: tenant.name, applies: match?.applies ?? false, reason: match?.reason ?? '', itemId, error: null }
    } catch (e) {
      console.error('getObligationTargets', tenant.id, e)
      return { tenantId: tenant.id, name: tenant.name, applies: false, reason: '', itemId: null, error: 'No se pudo leer la base de este cliente' }
    }
  }))
}

export type GenerateResult = { tenantId: string; name: string; itemId: string | null; aiDraft: boolean; error: string | null }

// Pocos clientes por vez: cada borrador es una llamada a Haiku y la función
// tiene 60 s en el plan free de Vercel.
const MAX_PER_RUN = 8

export async function generateObligations(sourceId: string, tenantIds: string[]): Promise<
  { ok: true; results: GenerateResult[] } | { ok: false; error: string }
> {
  const userId = await requireAdmin()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!tenantIds.length) return { ok: false, error: 'Elige al menos un cliente' }
  if (tenantIds.length > MAX_PER_RUN) return { ok: false, error: `Elige como máximo ${MAX_PER_RUN} clientes por vez` }

  const source = await readySource(sourceId).catch(() => null)
  if (!source) return { ok: false, error: 'La fuente aún no está categorizada' }
  const list = await db.select().from(tenants).where(inArray(tenants.id, tenantIds))

  const results = await Promise.all(list.map(async (tenant): Promise<GenerateResult> => {
    const base = { tenantId: tenant.id, name: tenant.name }
    try {
      const { tdb, profile, itemId: existing } = await tenantContext(tenant.id, sourceId)
      if (existing) return { ...base, itemId: existing, aiDraft: false, error: 'Ya tenía un borrador de esta publicación' }

      const company: Company = { name: tenant.name, ...profile, industry: profile?.industry || tenant.industry }
      let draft: Draft | null = null
      try {
        draft = await draftObligation(source, company)
      } catch (e) {
        // Sin IA queda un borrador con el resumen; el socio lo completa a mano.
        console.error('draftObligation', tenant.id, e)
      }

      const itemId = crypto.randomUUID()
      await tdb.insert(regulatoryItems).values({
        id: itemId,
        tenantId: tenant.id,
        scope: 'regulatorio',
        materia: ITEM_MATERIA[(source.materia ?? 'otra') as Materia] ?? 'Administrativo y simplificación',
        title: draft?.title ?? source.title.slice(0, 150),
        description: source.summary ?? '',
        instrumentType: draft?.instrumentType ?? null,
        authority: source.authority,
        source: source.parentId ? 'DOF' : source.kind === 'file' ? (source.fileName ?? 'Archivo') : new URL(source.url!).hostname,
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
        comments: 'Borrador generado desde la ingesta. Revísalo antes de enviarlo al cliente.',
        createdBy: userId,
      })
      await tdb.insert(regulatoryItemEvents).values({
        id: crypto.randomUUID(),
        itemId,
        tenantId: tenant.id,
        eventType: EVENT,
        title: 'Asunto identificado desde la ingesta',
        description: draft ? 'Otero propuso el borrador a partir de la publicación y el perfil de la empresa.' : 'Se abrió el expediente con el resumen de la publicación.',
        metadata: { ingestSourceId: source.id, aiDraft: Boolean(draft) },
        createdBy: session?.user.id ?? userId,
      })
      return { ...base, itemId, aiDraft: Boolean(draft), error: null }
    } catch (e) {
      console.error('generateObligations', tenant.id, e)
      return { ...base, itemId: null, aiDraft: false, error: 'No se pudo guardar en la base de este cliente' }
    }
  }))

  revalidatePath('/admin/obligaciones')
  revalidatePath('/admin')
  return { ok: true, results }
}
