'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { certifications } from '@/lib/db/schema'
import { getFirstTenantId } from './auth-helpers'

async function context() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('Tenant not found')
  return { userId: session.user.id, tenantId }
}

export async function getCertifications() {
  const { tenantId } = await context()
  return db.select().from(certifications).where(eq(certifications.tenantId, tenantId)).orderBy(desc(certifications.expiresAt), desc(certifications.updatedAt))
}

export async function createCertification(input: { name: string; issuer: string; issuedAt?: string; expiresAt?: string; owner?: string; notes?: string }) {
  const { userId, tenantId } = await context()
  if (!input.name.trim()) throw new Error('Name is required')
  await db.insert(certifications).values({ id: crypto.randomUUID(), tenantId, name: input.name.trim(), issuer: input.issuer.trim(), issuedAt: input.issuedAt || null, expiresAt: input.expiresAt || null, owner: input.owner?.trim() || null, notes: input.notes?.trim() || '', createdBy: userId })
  revalidatePath('/cliente/certificaciones')
}

export async function updateCertification(id: string, input: { name: string; issuer: string; issuedAt?: string; expiresAt?: string; owner?: string; notes?: string }) {
  const { tenantId } = await context()
  if (!input.name.trim()) throw new Error('Name is required')
  await db.update(certifications).set({ name: input.name.trim(), issuer: input.issuer.trim(), issuedAt: input.issuedAt || null, expiresAt: input.expiresAt || null, owner: input.owner?.trim() || null, notes: input.notes?.trim() || '', updatedAt: new Date() }).where(and(eq(certifications.id, id), eq(certifications.tenantId, tenantId)))
  revalidatePath('/cliente/certificaciones')
}

export type Certification = Awaited<ReturnType<typeof getCertifications>>[number]
