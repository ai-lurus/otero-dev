'use client'

import type { RegulatoryItem } from '@/app/actions/regulatory-items'
import { StatusTag, type Status } from '@/components/ui/status-tag'
import { BAND_LABELS, bandOf, deadlineLabel, daysUntil, type Band } from '@/lib/inbox'
import { cn } from '@/lib/utils'

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

const listDate = (item: RegulatoryItem) => {
  const value = item.publishedAt ? new Date(`${item.publishedAt}T00:00:00`) : new Date(item.updatedAt)
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(value)
}

type Props = {
  item: RegulatoryItem
  selected: boolean
  onOpen: () => void
}

/** Fila de la bandeja, como un correo: prioridad, título, fuente, resumen y fecha. */
export function InboxRow({ item, selected, onOpen }: Props) {
  const band = bandOf(item)
  const unread = item.status === 'identificada'
  const deadline = deadlineLabel(item.dueDate)
  const days = daysUntil(item.dueDate)

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={selected || undefined}
        className={cn(
          'flex w-full flex-col gap-2 border-b border-border px-4 py-4 text-left transition-colors hover:bg-surface-sunken md:px-6',
          selected && 'bg-brand-tint hover:bg-brand-tint',
        )}
      >
        <div className="flex items-center gap-2">
          <BandTag band={band} />
          <span className="min-w-0 flex-1 truncate text-caption text-ink-muted">{sourceCite(item)}</span>
          <span className="shrink-0 text-caption text-ink-muted">{listDate(item)}</span>
        </div>
        <div className="flex items-start gap-2">
          {unread && <span aria-label="Sin revisar" className="mt-2 size-2 shrink-0 rounded-pill bg-brand" />}
          <p className={cn('line-clamp-2 text-body-sm text-ink', unread ? 'font-semibold' : 'font-medium')}>{item.title}</p>
        </div>
        {item.description && <p className="line-clamp-1 text-body-sm text-ink-muted">{item.description}</p>}
        <div className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
          <span>{item.materia}</span>
          {deadline && <span className={cn(days !== null && days <= 15 && 'font-medium text-risk')}>· {deadline}</span>}
        </div>
      </button>
    </li>
  )
}
