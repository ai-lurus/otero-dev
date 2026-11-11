import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getFirstTenantId } from '@/app/actions/auth-helpers'
import { getDocuments } from '@/app/actions/documents'
import { isTenantAdmin } from '@/app/actions/tenant-users'
import DocumentosPage from './documentos-client'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const tenantId = await getFirstTenantId()
  const canManage = await isTenantAdmin()
  if (!tenantId) {
    return <DocumentosPage initialDocs={[]} tenantId="" canManage={canManage} />
  }

  const docs = await getDocuments(tenantId).catch(() => [])

  return <DocumentosPage initialDocs={docs} tenantId={tenantId} canManage={canManage} />
}
