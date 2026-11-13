import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getMyScreenPermissions } from '@/app/actions/access'
import { getComplianceBoard } from '@/app/actions/compliance-board'
import { ComplianceBoard } from '@/components/regulatory/compliance-board/compliance-board'

export default async function CumplimientoPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  if (!(await getMyScreenPermissions('cumplimiento')).view) redirect('/cliente')
  const { items, viewer, team } = await getComplianceBoard()
  return (
    <main className="min-h-screen bg-surface text-ink">
      <ComplianceBoard items={items} viewer={viewer} team={team} />
    </main>
  )
}
