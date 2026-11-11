'use server'

import { getTenantDb } from '@/lib/db/tenant'
import { documents, type DocumentRow } from '@/lib/db/schema'
import { and, eq, desc, gte, count, inArray } from 'drizzle-orm'
import { getFirstTenantId, getUserId } from './auth-helpers'
import { revalidatePath } from 'next/cache'
import { expiryState, sanitizeAnalysis, visibleStatus, type AnalysisStatus, type DocAnalysis } from '@/lib/documents/analysis'
import { dayInMexico } from '@/lib/ingest/dof'
import { requireDirector } from '@/lib/client-guard'
import { analysisRoom } from '@/lib/documents/batch'

export async function getDocuments(tenantId: string) {
  const currentTenantId = await getFirstTenantId()
  if (!currentTenantId || currentTenantId !== tenantId) throw new Error('Forbidden')
  const db = await getTenantDb(currentTenantId)
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, currentTenantId))
    .orderBy(desc(documents.uploadedAt))
  return rows.map(r => ({ ...r, analysisStatus: visibleStatus(r) }))
}

/** Estado actual de documentos recién subidos, para que la pantalla se actualice cuando Otero termina de leerlos. */
export async function getDocumentsByIds(ids: string[]) {
  const tenantId = await getFirstTenantId()
  if (!tenantId || ids.length === 0) return []
  const db = await getTenantDb(tenantId)
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, tenantId), inArray(documents.id, ids.slice(0, 100))))
  return rows.map(r => ({ ...r, analysisStatus: visibleStatus(r) }))
}

export async function signDocument(id: string) {
  await requireDirector()
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Forbidden')
  const db = await getTenantDb(tenantId)
  await db.update(documents).set({ signed: true }).where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
  revalidatePath('/cliente/documentos')
}

export async function deleteDocument(id: string) {
  await requireDirector()
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Forbidden')
  const db = await getTenantDb(tenantId)
  await db.delete(documents).where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
  revalidatePath('/cliente/documentos')
}

export async function addDocument(data: {
  tenantId: string
  name: string
  type: string
  category: string
  service?: string
  status: string
  size?: string
  expiresAt?: string
  requiresSignature: boolean
  blobUrl?: string
  blobPathname?: string
  analysis?: DocAnalysis | null
  /** 'analyzing' cuando la lectura corre en segundo plano. */
  analysisStatus?: AnalysisStatus
}) {
  await getUserId()
  const currentTenantId = await getFirstTenantId()
  if (!currentTenantId || currentTenantId !== data.tenantId) throw new Error('Forbidden')
  const id = crypto.randomUUID()
  const db = await getTenantDb(currentTenantId)
  const { analysis, analysisStatus, ...rest } = data
  await db.insert(documents).values({
    ...rest, id, tenantId: currentTenantId, uploadedAt: new Date(),
    analysis: analysis ?? null,
    analysisStatus: analysisStatus ?? (analysis ? 'detected' : 'none'),
  })

  revalidatePath('/cliente/documentos')
  return id
}

/** El cliente confirma o corrige lo detectado. La vigencia pasa a ser el vencimiento del documento. */
export async function confirmDocumentAnalysis(id: string, input: Record<string, unknown>) {
  // Lo confirmado alimenta el matching de RegWatch: lo decide el director.
  await requireDirector()
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Forbidden')
  const analysis = sanitizeAnalysis(input)
  const expiry = expiryState(analysis.vigenciaFin, dayInMexico(new Date()))
  const db = await getTenantDb(tenantId)
  const [row] = await db
    .update(documents)
    .set({
      analysis,
      analysisStatus: 'confirmed',
      analysisConfirmedAt: new Date(),
      expiresAt: analysis.vigenciaFin,
      ...(expiry ? { status: expiry } : {}),
    })
    .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
    .returning()
  if (!row) throw new Error('Documento no encontrado')
  revalidatePath('/cliente/documentos')
  return row
}

/** Cuántos documentos más puede analizar Otero hoy para esta empresa (ventana de 24 h). */
export async function getAnalysisRoom(tenantId: string) {
  const db = await getTenantDb(tenantId)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [row] = await db
    .select({ n: count() })
    .from(documents)
    .where(and(eq(documents.tenantId, tenantId), gte(documents.uploadedAt, since)))
  return analysisRoom(row?.n ?? 0)
}

export type BatchConfirmItem = { id: string; analysis: Record<string, unknown> }
export type BatchConfirmResult = { confirmed: DocumentRow[]; failed: string[] }

/** Confirma varios documentos a la vez. Uno que falla no detiene a los demás. Solo el director. */
export async function confirmDocumentsBatch(items: BatchConfirmItem[]): Promise<BatchConfirmResult> {
  await requireDirector()
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Forbidden')
  const db = await getTenantDb(tenantId)
  const today = dayInMexico(new Date())
  const confirmed: DocumentRow[] = []
  const failed: string[] = []
  for (const item of items.slice(0, 100)) {
    try {
      const analysis = sanitizeAnalysis(item.analysis)
      const expiry = expiryState(analysis.vigenciaFin, today)
      const [row] = await db
        .update(documents)
        .set({
          analysis,
          analysisStatus: 'confirmed',
          analysisConfirmedAt: new Date(),
          expiresAt: analysis.vigenciaFin,
          ...(expiry ? { status: expiry } : {}),
        })
        .where(and(eq(documents.id, item.id), eq(documents.tenantId, tenantId)))
        .returning()
      if (row) confirmed.push(row)
      else failed.push(item.id)
    } catch (error) {
      console.error('[documents] confirmación en lote falló', item.id, error)
      failed.push(item.id)
    }
  }
  revalidatePath('/cliente/documentos')
  return { confirmed, failed }
}
