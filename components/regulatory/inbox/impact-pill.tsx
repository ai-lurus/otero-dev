import { MinusIcon, TriangleAlertIcon } from 'lucide-react'
import { IMPACT_LABELS } from '@/lib/regulatory'
import { cn } from '@/lib/utils'

const TONE: Record<string, string> = {
  alto: 'bg-risk-tint text-risk',
  medio: 'bg-warn-tint text-warn-text',
  bajo: 'bg-surface-sunken text-ink-muted',
}

/** Impacto con palabra e ícono: triángulo, punto o guion. */
export function ImpactPill({ impact }: { impact: string | null }) {
  if (!impact) return <span className="text-ink-muted">—</span>
  const label = (IMPACT_LABELS[impact] ?? impact).replace('Impacto ', '')
  const Icon = impact === 'alto' ? TriangleAlertIcon : impact === 'bajo' ? MinusIcon : null
  return (
    <span className={cn('inline-flex w-fit items-center gap-1 rounded-pill px-2.5 py-1 text-label whitespace-nowrap capitalize', TONE[impact])}>
      {Icon ? <Icon aria-hidden className="size-3.5" strokeWidth={1.75} /> : <span aria-hidden className="size-2 rounded-pill bg-current" />}
      {label}
    </span>
  )
}
