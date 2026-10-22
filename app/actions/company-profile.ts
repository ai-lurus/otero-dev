'use server'

import { db } from '@/lib/db'
import { companyProfiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getUserId, getFirstTenantId, getSession } from './auth-helpers'
import { revalidatePath } from 'next/cache'

export async function getCompanyProfileForCurrentUser() {
  await getUserId()
  const session = await getSession()
  const tenantId = await getFirstTenantId()
  if (!tenantId || !session?.user) throw new Error('No tenant')

  const rows = await db
    .select()
    .from(companyProfiles)
    .where(eq(companyProfiles.tenantId, tenantId))
    .limit(1)

  return {
    user: {
      name: session.user.name,
      email: session.user.email,
    },
    profile: rows[0] ?? null,
  }
}

export async function getCompanyProfile(tenantId: string) {
  await getUserId()
  const currentTenantId = await getFirstTenantId()
  if (!currentTenantId || currentTenantId !== tenantId) throw new Error('Forbidden')
  const rows = await db
    .select()
    .from(companyProfiles)
    .where(eq(companyProfiles.tenantId, currentTenantId))
    .limit(1)
  return rows[0] ?? null
}

export async function saveCompanyProfile(data: {
  description:    string
  industry:       string
  employees:      string
  states:         string
  activities:     string
  certifications: string
  riesgos:        string
}) {
  await getUserId()
  const tenantId = await getFirstTenantId()
  if (!tenantId) throw new Error('No tenant')

  await db
    .insert(companyProfiles)
    .values({ tenantId, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: companyProfiles.tenantId,
      set: { ...data, updatedAt: new Date() },
    })

  revalidatePath('/cliente/perfil')
  revalidatePath('/api/compi')
}
