import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRegulatoryItem } from '@/app/actions/regulatory-items'
import { isTenantAdmin } from '@/app/actions/tenant-users'
import { ObligationDetail } from './obligation-detail'

export default async function ObligationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { id } = await params
  const obligation = await getRegulatoryItem(id).catch(() => null)
  if (!obligation) notFound()

  return <ObligationDetail obligation={obligation} canDecide={await isTenantAdmin()} />
}
