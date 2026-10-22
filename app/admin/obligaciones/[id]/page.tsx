import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAdminItem } from '@/app/actions/regulatory-items'
import { ObligationDetail } from '@/app/cliente/obligaciones/[id]/obligation-detail'

export default async function AdminObligationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { id } = await params
  const item = await getAdminItem(id)
  if (!item) notFound()

  return <ObligationDetail obligation={item} adminMode tenantId={item.tenantId} />
}
