'use server'

import { getTenantDb } from '@/lib/db/tenant'
import { companyProfiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getUserId, getFirstTenantId, getSession } from './auth-helpers'
import { revalidatePath } from 'next/cache'
import { actorOf, requirePermission } from '@/lib/access'
import { logAction } from '@/lib/audit'
import { sanitizeCompany } from '@/lib/onboarding'

export async function getCompanyProfileForCurrentUser() {
  await getUserId()
  const session = await getSession()
  const tenantId = await getFirstTenantId()
  if (!tenantId || !session?.user) throw new Error('No tenant')

  const db = await getTenantDb(tenantId)
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
  const db = await getTenantDb(currentTenantId)
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
  activities:     string
  certifications: string
  riesgos:        string
}) {
  // El perfil de la empresa alimenta a RegWatch: lo edita el director.
  const access = await requirePermission('perfil', 'edit')
  const tenantId = access.tenantId
  const db = await getTenantDb(tenantId)
  // Mismo tope por campo que la UI: el servidor no confía en lo que manda el navegador.
  const { description, industry, activities, certifications, riesgos } = sanitizeCompany(data)
  const clean = { description, industry, activities, certifications, riesgos }

  await db
    .insert(companyProfiles)
    .values({ tenantId, ...clean, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: companyProfiles.tenantId,
      set: { ...clean, updatedAt: new Date() },
    })

  await logAction(actorOf(access), 'empresa.perfil_guardado', { entityType: 'empresa', entityId: tenantId })
  revalidatePath('/cliente/perfil')
  revalidatePath('/api/compi')
}
