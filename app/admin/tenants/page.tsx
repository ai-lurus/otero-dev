import { getTenants } from '@/app/actions/admin'
import { getUsersWithTenants } from '@/app/actions/admin'
import { getMonitoringStatuses } from '@/app/actions/monitoring-profile'
import TenantManager from './tenant-manager'

export default async function TenantsPage() {
  const [tenantList, usersWithTenants, monitoring] = await Promise.all([
    getTenants(),
    getUsersWithTenants(),
    getMonitoringStatuses().catch(() => ({})),
  ])

  // Build per-tenant user count map
  const userCountByTenant: Record<string, number> = {}
  for (const u of usersWithTenants) {
    for (const m of u.memberships ?? []) {
      const tid = m.tenantId as string
      userCountByTenant[tid] = (userCountByTenant[tid] ?? 0) + 1
    }
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Empresas (Tenants)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona las empresas cliente de la plataforma. Cada empresa es un tenant independiente con sus propios usuarios y documentos.
        </p>
      </div>
      <TenantManager tenants={tenantList} userCountByTenant={userCountByTenant} monitoring={monitoring} />
    </div>
  )
}
