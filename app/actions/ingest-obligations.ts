'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ingestMatches, ingestSources, tenants } from '@/lib/db/schema'
import { createItemFromSource, sourceLabelOf } from '@/lib/ingest/generate'
import { computeMatches } from '@/lib/ingest/matching'
import { requireAdmin } from './auth-helpers'

// De una publicación ya categorizada en la ingesta a borradores de obligación
// en la base de cada cliente. Nada llega al cliente hasta que el socio lo
// envía desde la matriz regulatoria.

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
  // Solo la base principal: no se abre la base de cada cliente al listar.
  return list.map((tenant): ObligationTarget => {
    const match = matches.get(tenant.id)
    return {
      tenantId: tenant.id,
      name: tenant.name,
      applies: match?.applies ?? false,
      reason: match?.reason ?? 'No se pudo evaluar; revisa si aplica',
      itemId: match?.draftItemId ?? null,
      error: null,
    }
  })
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
  const sourceLabel = await sourceLabelOf(source)

  const results = await Promise.all(list.map(async (tenant): Promise<GenerateResult> => {
    const base = { tenantId: tenant.id, name: tenant.name }
    try {
      const created = await createItemFromSource({ source, sourceLabel, tenant, actorId: session?.user.id ?? userId, send: false })
      if (created.existing) {
        await db.update(ingestMatches).set({ draftItemId: created.itemId }).where(and(eq(ingestMatches.sourceId, source.id), eq(ingestMatches.tenantId, tenant.id)))
        return { ...base, itemId: created.itemId, aiDraft: false, error: 'Ya tenía un borrador de esta publicación' }
      }
      return { ...base, itemId: created.itemId, aiDraft: created.aiDraft, error: null }
    } catch (e) {
      console.error('generateObligations', tenant.id, e)
      return { ...base, itemId: null, aiDraft: false, error: 'No se pudo guardar en la base de este cliente' }
    }
  }))

  revalidatePath('/admin/obligaciones')
  revalidatePath('/admin')
  return { ok: true, results }
}
