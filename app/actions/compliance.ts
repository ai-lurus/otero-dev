'use server'

import { headers } from 'next/headers'
import { and, desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getTenantDb } from '@/lib/db/tenant'
import { documents } from '@/lib/db/schema'
import { getFirstTenantId } from './auth-helpers'

export async function getComplianceDocuments() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Tenant not found')
  const db = await getTenantDb(tenantId)

  return db
    .select({
      id: documents.id,
      name: documents.name,
      fileName: documents.name,
      fileType: documents.type,
      fileSize: documents.size,
      category: documents.category,
      status: documents.status,
      expiresAt: documents.expiresAt,
      uploadedAt: documents.uploadedAt,
    })
    .from(documents)
    .where(eq(documents.tenantId, tenantId))
    .orderBy(desc(documents.uploadedAt))
}

export async function updateComplianceDocumentStatus(id: string, status: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Tenant not found')
  const allowedStatuses = ['vigente', 'por_vencer', 'vencido', 'archivado', 'sin_vencimiento']
  if (!allowedStatuses.includes(status)) throw new Error('Invalid status')
  const db = await getTenantDb(tenantId)
  const updated = await db
    .update(documents)
    .set({ status })
    .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
    .returning({ id: documents.id })

  if (!updated[0]) throw new Error('Document not found')
  return updated[0]
}
