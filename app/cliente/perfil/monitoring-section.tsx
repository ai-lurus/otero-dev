'use client'

import { useRouter } from 'next/navigation'
import { saveMyMonitoringProfile } from '@/app/actions/monitoring-profile'
import { MonitoringForm } from '@/components/monitoring/monitoring-form'
import { PROFILE_STATUS_LABELS, profileStatus, scianLabel, type MonitoringFields } from '@/lib/monitoring-profile'

// Qué vigila Otero para la empresa. El admin del cliente lo corrige y lo
// confirma; el resto de las personas solo ve el resumen.
export default function MonitoringSection({ profile, canEdit }: { profile: MonitoringFields | null; canEdit: boolean }) {
  const router = useRouter()
  const confirmed = profile?.confirmedAt ? new Date(profile.confirmedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : null

  return (
    <div id="monitoreo">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Qué vigila Otero para tu empresa</p>
      <div className="bg-card border border-border rounded-2xl px-4 py-4">
        <p className="text-[11px] text-muted-foreground mb-4 leading-snug">
          RegWatch usa estos datos para decidir qué publicaciones del DOF y otras fuentes te llegan.
          {confirmed ? ` Confirmado el ${confirmed}.` : ' Revísalos y confírmalos para recibir lo de tu sector.'}
        </p>
        {canEdit ? (
          <MonitoringForm
            initial={profile}
            materiasEditable={false}
            canConfirm
            onSave={async (values, confirm) => {
              await saveMyMonitoringProfile(values, confirm)
              router.refresh()
            }}
          />
        ) : (
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">{PROFILE_STATUS_LABELS[profileStatus(profile)]}</p>
            <p className="text-muted-foreground">{scianLabel(profile?.scian) ?? 'Actividad sin capturar'}</p>
            <p className="text-muted-foreground">{profile?.stateList?.length ? profile.stateList.join(', ') : 'Estados sin capturar'}</p>
            <p className="text-xs text-muted-foreground pt-1">Solo el administrador de tu empresa puede cambiarlo.</p>
          </div>
        )}
      </div>
    </div>
  )
}
