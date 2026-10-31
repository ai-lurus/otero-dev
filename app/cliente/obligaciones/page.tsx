import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAssignableMembers, getRegulatoryItems } from '@/app/actions/regulatory-items'
import { isTenantAdmin } from '@/app/actions/tenant-users'
import { getCompanyProfileForCurrentUser } from '@/app/actions/company-profile'
import { profileStatus } from '@/lib/monitoring-profile'
import ObligationsClient from './obligations-client'

export default async function ObligationsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const [items, members, canDecide, company] = await Promise.all([
    getRegulatoryItems().catch(() => []),
    getAssignableMembers().catch(() => []),
    isTenantAdmin(),
    getCompanyProfileForCurrentUser().catch(() => null),
  ])
  // Sin perfil de monitoreo completo solo llegan las materias generales: se avisa.
  const profileIncomplete = company ? profileStatus(company.profile) !== 'completo' : false
  // Solo el admin del cliente recibe la lista de personas: es quien puede asignar.
  return <ObligationsClient items={items} members={members} canDecide={canDecide} profileIncomplete={profileIncomplete} />
}
