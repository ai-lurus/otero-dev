'use server'

import { getTenantDb } from '@/lib/db/tenant'
import { documents } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getFirstTenantId, getUserId } from './auth-helpers'
import { revalidatePath } from 'next/cache'

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
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Forbidden')
  const db = await getTenantDb(tenantId)
  await db.update(documents).set({ signed: true }).where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
  revalidatePath('/cliente/documentos')
}

export async function deleteDocument(id: string) {
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
}) {
  await getUserId()
  const currentTenantId = await getFirstTenantId()
  if (!currentTenantId || currentTenantId !== data.tenantId) throw new Error('Forbidden')
  const id = crypto.randomUUID()
  const db = await getTenantDb(currentTenantId)
  await db.insert(documents).values({ ...data, id, tenantId: currentTenantId, uploadedAt: new Date() })

  revalidatePath('/cliente/documentos')
  return id
}
