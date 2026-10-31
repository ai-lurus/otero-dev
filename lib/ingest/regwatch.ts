import { and, count, desc, eq, gte, inArray, isNotNull, isNull, lt, ne, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { ingestMatches, ingestSources, tenants } from '@/lib/db/schema'
import { familyCounts } from '@/lib/legal-objects'
import { NoEditionError, todayInMexico } from './dof'
import { createItemFromSource, sourceLabelOf } from './generate'
import { processSourceCore } from './process'
import { syncSiteCore } from './sync'

// Sync automático de RegWatch. Lo llama el cron (app/api/cron/regwatch):
// 1) lee los sitios recurrentes y crea las publicaciones nuevas,
// 2) categoriza cada una y calcula a qué clientes aplica,
// 3) genera el asunto en la base de cada cliente al que aplica, ya visible.
// Cada corrida trabaja dentro de un presupuesto de tiempo y avisa si queda
// trabajo; todo es idempotente, así que se puede volver a llamar hasta terminar.

/** Autor de lo que crea el sync automático. */
export const SYSTEM_ACTOR = 'system'
const STUCK_AFTER_MS = 5 * 60 * 1000
const LOCAL_ONLY_HOST = 'herramientasregulatorias.gob.mx'
const GENERATE_BATCH = 4
/** No se generan asuntos de publicaciones más viejas que esto (el listado de un sitio puede traer historial). */
const MAX_AGE_DAYS = 30
/** Motivo con que se marca un par que falló: no se reintenta solo, el socio lo ve en el panel de ingesta. */
export const FAILED_REASON = 'No se pudo generar el asunto automáticamente'
/** Topes diarios para cuidar tokens: publicaciones categorizadas y asuntos generados (pares publicación-cliente). */
const MAX_PROCESSED_PER_DAY = Number(process.env.REGWATCH_MAX_PROCESSED_PER_DAY ?? 15)
const MAX_ITEMS_PER_DAY = Number(process.env.REGWATCH_MAX_ITEMS_PER_DAY ?? 2)

/** Medianoche de hoy en CDMX (UTC-6 todo el año). */
const startOfTodayMexico = () => new Date(`${todayInMexico()}T06:00:00Z`)

async function processedToday() {
  const start = startOfTodayMexico()
  const [row] = await db.select({ n: count() }).from(ingestSources).where(and(
    eq(ingestSources.createdBy, SYSTEM_ACTOR),
    or(gte(ingestSources.processedAt, start), and(eq(ingestSources.status, 'error'), gte(ingestSources.updatedAt, start))),
  ))
  return row?.n ?? 0
}

async function generatedToday() {
  const [row] = await db.select({ n: count() }).from(ingestMatches)
    .where(and(isNotNull(ingestMatches.draftItemId), gte(ingestMatches.updatedAt, startOfTodayMexico())))
  return row?.n ?? 0
}

export type RegwatchRun = {
  sites: number
  newSources: number
  processed: number
  generated: number
  failed: number
  remaining: boolean
}

const dayBefore = (day: string) => new Date(new Date(`${day}T12:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10)

async function syncAllSites(run: RegwatchRun) {
  // La PIGR bloquea a los servidores: sus fichas llegan por el script local (pnpm pigr:ingest), no por aquí.
  const sites = (await db.select().from(ingestSources).where(eq(ingestSources.kind, 'site')))
    .filter(site => site.url && !new URL(site.url).hostname.includes(LOCAL_ONLY_HOST))
  const today = todayInMexico()
  for (const site of sites) {
    run.sites += 1
    // El DOF se lee también por el día anterior por si una corrida falló.
    for (const day of [today, dayBefore(today)]) {
      try {
        const sync = await syncSiteCore(site, SYSTEM_ACTOR, day)
        run.newSources += sync.created.length
      } catch (e) {
        // Un día sin edición del DOF no es una falla.
        if (!(e instanceof NoEditionError)) {
          console.error('regwatch sync', site.id, day, e)
          run.failed += 1
        }
      }
      if (!site.url || !new URL(site.url).hostname.includes('dof.gob.mx')) break
    }
  }
}

async function processQueued(run: RegwatchRun, deadline: number) {
  let left = MAX_PROCESSED_PER_DAY - await processedToday()
  while (Date.now() < deadline && left > 0) {
    const [next] = await db.select({ id: ingestSources.id }).from(ingestSources).where(and(
      eq(ingestSources.createdBy, SYSTEM_ACTOR),
      or(
        eq(ingestSources.status, 'en_cola'),
        and(eq(ingestSources.status, 'procesando'), lt(ingestSources.updatedAt, new Date(Date.now() - STUCK_AFTER_MS))),
      ),
    )).orderBy(desc(ingestSources.createdAt)).limit(1)
    if (!next) return
    if (await processSourceCore(next.id)) { run.processed += 1; left -= 1 }
    else return
  }
}

/**
 * Pares publicación-cliente por generar: aplica y todavía no tiene asunto. Solo lo creado por el sync.
 * Primero las publicaciones con objetos que piden acción, luego las más recientes.
 */
async function pendingPairs() {
  const rows = await db.select({ sourceId: ingestMatches.sourceId, tenantId: ingestMatches.tenantId, objects: ingestSources.objects })
    .from(ingestMatches)
    .innerJoin(ingestSources, eq(ingestSources.id, ingestMatches.sourceId))
    .where(and(
      eq(ingestSources.createdBy, SYSTEM_ACTOR),
      eq(ingestSources.status, 'lista'),
      eq(ingestMatches.applies, true),
      or(isNull(ingestSources.publishedAt), gte(ingestSources.publishedAt, new Date(Date.now() - MAX_AGE_DAYS * 86_400_000).toISOString().slice(0, 10))),
      isNull(ingestMatches.draftItemId),
      ne(ingestMatches.reason, FAILED_REASON),
    ))
    .orderBy(desc(ingestSources.createdAt))
  const withAction = (r: (typeof rows)[number]) => (familyCounts(r.objects).length ? 1 : 0)
  return rows.sort((a, b) => withAction(b) - withAction(a))
}

async function generatePending(run: RegwatchRun, deadline: number) {
  let left = MAX_ITEMS_PER_DAY - await generatedToday()
  while (Date.now() < deadline && left > 0) {
    const batch = (await pendingPairs()).slice(0, Math.min(GENERATE_BATCH, left))
    if (!batch.length) return
    const sources = await db.select().from(ingestSources).where(inArray(ingestSources.id, [...new Set(batch.map(p => p.sourceId))]))
    const tenantList = await db.select().from(tenants).where(inArray(tenants.id, [...new Set(batch.map(p => p.tenantId))]))
    const labels = new Map(await Promise.all(sources.map(async (s) => [s.id, await sourceLabelOf(s)] as const)))
    const results = await Promise.all(batch.map(async (pair) => {
      const source = sources.find(s => s.id === pair.sourceId)
      const tenant = tenantList.find(t => t.id === pair.tenantId)
      if (!source || !tenant) return 'failed' as const
      try {
        await createItemFromSource({ source, sourceLabel: labels.get(source.id) ?? 'Sitio recurrente', tenant, actorId: SYSTEM_ACTOR, send: true })
        return 'ok' as const
      } catch (e) {
        console.error('regwatch generate', pair, e)
        // Se marca para no reintentar sin fin; el motivo queda a la vista.
        await db.update(ingestMatches).set({ reason: FAILED_REASON, updatedAt: new Date() })
          .where(and(eq(ingestMatches.sourceId, pair.sourceId), eq(ingestMatches.tenantId, pair.tenantId)))
        return 'failed' as const
      }
    }))
    run.generated += results.filter(r => r === 'ok').length
    left -= results.filter(r => r === 'ok').length
    run.failed += results.filter(r => r === 'failed').length
    // Un par que falló sigue sin asunto: salir si nada avanzó evita un ciclo sin fin dentro de la corrida.
    if (!results.includes('ok')) return
  }
}

export async function runRegwatch(opts: { budgetMs: number; syncSites: boolean }): Promise<RegwatchRun> {
  const deadline = Date.now() + opts.budgetMs
  const run: RegwatchRun = { sites: 0, newSources: 0, processed: 0, generated: 0, failed: 0, remaining: false }
  if (opts.syncSites) await syncAllSites(run)
  await processQueued(run, deadline)
  await generatePending(run, deadline)

  // Con los topes del día alcanzados no queda trabajo para hoy: lo pendiente espera al día siguiente.
  const canProcess = await processedToday() < MAX_PROCESSED_PER_DAY
  const canGenerate = await generatedToday() < MAX_ITEMS_PER_DAY
  const [queued] = canProcess
    ? await db.select({ id: ingestSources.id }).from(ingestSources)
      .where(and(eq(ingestSources.createdBy, SYSTEM_ACTOR), eq(ingestSources.status, 'en_cola'))).limit(1)
    : []
  run.remaining = Boolean(queued) || (canGenerate && (await pendingPairs()).length > 0)
  return run
}
