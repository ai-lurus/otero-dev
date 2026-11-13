'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq } from 'drizzle-orm'
import { getTenantDb } from '@/lib/db/tenant'
import { certifications } from '@/lib/db/schema'
import { actorOf, requirePermission } from '@/lib/access'
import { logAction } from '@/lib/audit'
import type { PermissionAction } from '@/lib/client-permissions'

// Certificaciones de toda la empresa: el director decide quién las ve y edita.
async function context(action: PermissionAction) {
  const access = await requirePermission('certificaciones', action)
  return { access, userId: access.userId, tenantId: access.tenantId, db: await getTenantDb(access.tenantId) }
}

export async function getCertifications() {
  const { tenantId, db } = await context('view')
  return db.select().from(certifications).where(eq(certifications.tenantId, tenantId)).orderBy(desc(certifications.expiresAt), desc(certifications.updatedAt))
}

export async function createCertification(input: { name: string; issuer: string; issuedAt?: string; expiresAt?: string; owner?: string; notes?: string }) {
  const { access, userId, tenantId, db } = await context('create')
  if (!input.name.trim()) throw new Error('Name is required')
  const id = crypto.randomUUID()
  await db.insert(certifications).values({ id, tenantId, name: input.name.trim(), issuer: input.issuer.trim(), issuedAt: input.issuedAt || null, expiresAt: input.expiresAt || null, owner: input.owner?.trim() || null, notes: input.notes?.trim() || '', createdBy: userId })
  await logAction(actorOf(access), 'certificacion.creada', { entityType: 'certificacion', entityId: id, entityLabel: input.name.trim(), detail: `Emisor: ${input.issuer.trim() || 'sin emisor'}` })
  revalidatePath('/cliente/certificaciones')
}

export async function updateCertification(id: string, input: { name: string; issuer: string; issuedAt?: string; expiresAt?: string; owner?: string; notes?: string }) {
  const { access, tenantId, db } = await context('edit')
  if (!input.name.trim()) throw new Error('Name is required')
  await db.update(certifications).set({ name: input.name.trim(), issuer: input.issuer.trim(), issuedAt: input.issuedAt || null, expiresAt: input.expiresAt || null, owner: input.owner?.trim() || null, notes: input.notes?.trim() || '', updatedAt: new Date() }).where(and(eq(certifications.id, id), eq(certifications.tenantId, tenantId)))
  await logAction(actorOf(access), 'certificacion.editada', { entityType: 'certificacion', entityId: id, entityLabel: input.name.trim() })
  revalidatePath('/cliente/certificaciones')
}

export type Certification = Awaited<ReturnType<typeof getCertifications>>[number]
