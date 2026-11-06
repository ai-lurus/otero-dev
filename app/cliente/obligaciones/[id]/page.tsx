import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRegulatoryItem } from '@/app/actions/regulatory-items'
import { isTenantAdmin } from '@/app/actions/tenant-users'
import { ObligationDetail } from './obligation-detail'

const TABS = ['resumen', 'nota', 'documento', 'evidencia'] as const
type Tab = (typeof TABS)[number]
const isTab = (value: unknown): value is Tab => typeof value === 'string' && (TABS as readonly string[]).includes(value)

export default async function ObligationDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; from?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const { id } = await params
  const { tab, from } = await searchParams
  const obligation = await getRegulatoryItem(id).catch(() => null)
  if (!obligation) notFound()

  return <ObligationDetail obligation={obligation} canDecide={await isTenantAdmin()} initialTab={isTab(tab) ? tab : 'resumen'} fromBoard={from === 'cumplimiento'} />
}
