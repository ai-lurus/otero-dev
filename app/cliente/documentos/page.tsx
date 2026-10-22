import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getFirstTenantId } from '@/app/actions/auth-helpers'
import { getDocuments } from '@/app/actions/documents'
import DocumentosPage from './documentos-client'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const tenantId = await getFirstTenantId()
  if (!tenantId) {
    return <DocumentosPage initialDocs={[]} tenantId="" />
  }

  const docs = await getDocuments(tenantId).catch(() => [])

  return <DocumentosPage initialDocs={docs} tenantId={tenantId} />
}
