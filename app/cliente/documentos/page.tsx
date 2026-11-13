import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getFirstTenantId } from '@/app/actions/auth-helpers'
import { getDocuments } from '@/app/actions/documents'
import { getMyScreenPermissions } from '@/app/actions/access'
import DocumentosPage from './documentos-client'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const tenantId = await getFirstTenantId()
  const perms = await getMyScreenPermissions('documentos')
  if (!perms.view) redirect('/cliente')
  const access = { canManage: perms.edit, canUpload: perms.create, canDelete: perms.delete }
  if (!tenantId) {
    return <DocumentosPage initialDocs={[]} tenantId="" {...access} />
  }

  const docs = await getDocuments(tenantId).catch(() => [])

  return <DocumentosPage initialDocs={docs} tenantId={tenantId} {...access} />
}
