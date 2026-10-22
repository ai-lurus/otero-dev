import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRegulatoryItems } from '@/app/actions/regulatory-items'
import ObligationsClient from './obligations-client'

export default async function ObligationsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const items = await getRegulatoryItems().catch(() => [])
  return <ObligationsClient items={items} />
}
