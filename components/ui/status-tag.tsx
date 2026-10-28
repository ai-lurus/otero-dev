import * as React from 'react'
import { CheckIcon, ClockIcon, InfoIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

// Etiqueta de estado del design system: siempre palabra + ícono, nunca solo color.
// Riesgo se reserva para plazos vencidos o por vencer y multas posibles.
const STATUS = {
  risk: { label: 'Riesgo', icon: TriangleAlertIcon, className: 'bg-risk-tint text-risk' },
  warn: { label: 'Atención', icon: ClockIcon, className: 'bg-warn-tint text-warn-text' },
  ok: { label: 'Al día', icon: CheckIcon, className: 'bg-ok-tint text-ok' },
  info: { label: 'Informativo', icon: InfoIcon, className: 'bg-brand-tint text-brand-text' },
} satisfies Record<string, { label: string; icon: LucideIcon; className: string }>

export type Status = keyof typeof STATUS

function StatusTag({
  status,
  label,
  className,
  ...props
}: React.ComponentProps<'span'> & { status: Status; label?: string }) {
  const { label: defaultLabel, icon: Icon, className: tone } = STATUS[status]

  return (
    <span
      data-slot="status-tag"
      className={cn('inline-flex w-fit items-center gap-1 rounded-pill px-2.5 py-1 text-label whitespace-nowrap', tone, className)}
      {...props}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
      {label ?? defaultLabel}
    </span>
  )
}

// Chip de plazo ("Vence en 5 días"), solo junto a Riesgo o Atención.
function DeadlineChip({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="deadline-chip"
      className={cn('inline-flex w-fit items-center rounded-pill bg-warn px-2.5 py-1 text-label text-on-warn whitespace-nowrap', className)}
      {...props}
    />
  )
}

// Cita de la fuente ("DOF 02/10/2026 · Art. 15"). Sin cita, no hay alerta.
function Cite({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="cite"
      className={cn('inline-flex w-fit items-center rounded-sm bg-surface-sunken px-2 py-0.5 text-cite text-ink-muted', className)}
      {...props}
    />
  )
}

export { StatusTag, DeadlineChip, Cite }
