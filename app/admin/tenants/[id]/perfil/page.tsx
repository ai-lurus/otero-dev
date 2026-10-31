import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMonitoringProfileForAdmin } from '@/app/actions/monitoring-profile'
import AdminMonitoringForm from './admin-monitoring-form'

export default async function TenantMonitoringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getMonitoringProfileForAdmin(id).catch(() => null)
  if (!data) notFound()
  const { tenant, profile } = data
  const confirmed = profile?.confirmedAt ? new Date(profile.confirmedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : null

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <Link href="/admin/tenants" className="text-xs text-muted-foreground hover:text-foreground">← Empresas</Link>
      <p role="heading" aria-level={1} className="mt-2 font-serif text-2xl font-semibold text-foreground">Perfil de monitoreo · {tenant.name}</p>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Con esto RegWatch decide qué publicaciones le llegan a esta empresa. El admin del cliente lo ve en su perfil y lo puede corregir y confirmar.
        {confirmed ? ` Confirmado por el cliente el ${confirmed}.` : ' El cliente aún no lo confirma.'}
      </p>
      <AdminMonitoringForm tenantId={tenant.id} initial={profile} />
    </div>
  )
}
