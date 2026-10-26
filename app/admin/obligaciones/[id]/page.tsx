import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAdminItem } from '@/app/actions/regulatory-items'
import { ObligationDetail } from '@/app/cliente/obligaciones/[id]/obligation-detail'

export default async function AdminObligationDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tenant?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { id } = await params
  // El asunto vive en la base del cliente, así que hace falta saber de cuál.
  const { tenant } = await searchParams
  if (!tenant) notFound()
  const item = await getAdminItem(tenant, id).catch(() => null)
  if (!item) notFound()

  return <ObligationDetail obligation={item} adminMode tenantId={item.tenantId} />
}
