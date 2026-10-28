import * as React from 'react'

import { Cite, DeadlineChip, StatusTag, type Status } from '@/components/ui/status-tag'
import { cn } from '@/lib/utils'

type RegulatoryAlertProps = {
  status: Status
  title: string
  source: string
  children: React.ReactNode
  deadline?: string
  actions?: React.ReactNode
  className?: string
}

// Tarjeta de alerta regulatoria del design system. Estructura fija:
// estado + cita · título · una frase de consecuencia · plazo y acciones.
// Solo en Riesgo el cuerpo abre con "Ojo:". Sin fuente, la alerta no se muestra.
export function RegulatoryAlert({ status, title, source, children, deadline, actions, className }: RegulatoryAlertProps) {
  if (!source.trim()) return null

  const showDeadline = deadline && (status === 'risk' || status === 'warn')

  return (
    <article className={cn('flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6 text-ink', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusTag status={status} />
        <Cite>{source}</Cite>
      </div>
      <h3 className="text-heading">{title}</h3>
      <p className="text-body text-ink-muted">
        {status === 'risk' && <strong className="font-semibold text-risk">Ojo: </strong>}
        {children}
      </p>
      {(showDeadline || actions) && (
        <div className="flex flex-wrap items-center gap-3">
          {showDeadline && <DeadlineChip>{deadline}</DeadlineChip>}
          {actions && <div className="ml-auto flex flex-wrap gap-3">{actions}</div>}
        </div>
      )}
    </article>
  )
}
