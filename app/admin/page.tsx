import AdminDashboard from './admin-dashboard-client'
import { getAdminDashboardData } from '@/app/actions/regulatory-items'

export default async function AdminPage() {
  const { items } = await getAdminDashboardData()
  const referenceDate = new Date().toISOString().slice(0, 10)
  return <AdminDashboard items={items} referenceDate={referenceDate} />
}
