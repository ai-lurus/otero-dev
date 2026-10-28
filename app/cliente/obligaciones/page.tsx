import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getAssignableMembers, getRegulatoryItems } from '@/app/actions/regulatory-items'
import ObligationsClient from './obligations-client'

export default async function ObligationsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const [items, members] = await Promise.all([
    getRegulatoryItems().catch(() => []),
    getAssignableMembers().catch(() => []),
  ])
  // Solo el admin del cliente recibe la lista de personas: es quien puede asignar.
  return <ObligationsClient items={items} members={members} />
}
