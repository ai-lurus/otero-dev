import type { RegulatoryItem } from '@/app/actions/regulatory-items'
import { StatusTag, type Status } from '@/components/ui/status-tag'
import { BAND_LABELS, type Band } from '@/lib/inbox'

const BAND_STATUS: Record<Band, Status> = { critica: 'risk', alta: 'warn', media: 'info', baja: 'info' }

export function BandTag({ band }: { band: Band }) {
  return <StatusTag status={BAND_STATUS[band]} label={BAND_LABELS[band]} />
}

const shortDate = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`))

/** Cita de la fuente: "DOF · 02/10/2026". */
export function sourceCite(item: RegulatoryItem) {
  return [item.source, item.publishedAt && shortDate(item.publishedAt)].filter(Boolean).join(' · ')
}
