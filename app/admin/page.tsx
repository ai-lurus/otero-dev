import { Suspense } from 'react'
import AdminDashboard from './admin-dashboard-client'
import { getAdminDashboardData } from '@/app/actions/regulatory-items'
import { AdminHomeSkeleton } from '@/components/shared/skeletons'

async function AdminHome() {
  const { items } = await getAdminDashboardData()
  const referenceDate = new Date().toISOString().slice(0, 10)
  return <AdminDashboard items={items} referenceDate={referenceDate} />
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminHomeSkeleton />}>
      <AdminHome />
    </Suspense>
  )
}
