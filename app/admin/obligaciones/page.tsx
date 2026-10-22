import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenants } from '@/app/actions/admin'
import { getAdminItems } from '@/app/actions/regulatory-items'
import { AdminBoard } from './admin-board'

export default async function AdminObligacionesPage({ searchParams }: { searchParams: Promise<{ tenant?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const tenants = await getTenants().catch(() => [])
  const { tenant } = await searchParams
  const selected = tenants.find((entry) => entry.id === tenant) ?? tenants[0]
  const items = selected ? await getAdminItems(selected.id).catch(() => []) : []

  return <AdminBoard tenants={tenants.map(({ id, name }) => ({ id, name }))} tenantId={selected?.id ?? null} items={items} />
}
