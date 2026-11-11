'use server'

import { getTenantDb } from '@/lib/db/tenant'
import { documents } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getFirstTenantId, getUserId } from './auth-helpers'
import { revalidatePath } from 'next/cache'
import { expiryState, sanitizeAnalysis, type DocAnalysis } from '@/lib/documents/analysis'
import { dayInMexico } from '@/lib/ingest/dof'
import { requireDirector } from '@/lib/client-guard'

export async function getDocuments(tenantId: string) {
  const currentTenantId = await getFirstTenantId()
  if (!currentTenantId || currentTenantId !== tenantId) throw new Error('Forbidden')
  const db = await getTenantDb(currentTenantId)
  return db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, currentTenantId))
    .orderBy(desc(documents.uploadedAt))
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
}) {
  await getUserId()
  const currentTenantId = await getFirstTenantId()
  if (!currentTenantId || currentTenantId !== data.tenantId) throw new Error('Forbidden')
  const id = crypto.randomUUID()
  const db = await getTenantDb(currentTenantId)
  const { analysis, ...rest } = data
  await db.insert(documents).values({
    ...rest, id, tenantId: currentTenantId, uploadedAt: new Date(),
    analysis: analysis ?? null,
    analysisStatus: analysis ? 'detected' : 'none',
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
