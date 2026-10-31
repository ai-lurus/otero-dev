'use client'

import { useRouter } from 'next/navigation'
import { saveMonitoringProfileAsAdmin } from '@/app/actions/monitoring-profile'
import { MonitoringForm } from '@/components/monitoring/monitoring-form'
import type { MonitoringFields } from '@/lib/monitoring-profile'

export default function AdminMonitoringForm({ tenantId, initial }: { tenantId: string; initial: MonitoringFields | null }) {
  const router = useRouter()
  return (
    <MonitoringForm
      initial={initial}
      materiasEditable
      onSave={async (values) => {
        await saveMonitoringProfileAsAdmin(tenantId, values)
        router.refresh()
      }}
    />
  )
}
