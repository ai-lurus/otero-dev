import { Building2, CalendarClock, Droplets, Factory, MapPin, Award, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Finding, Proposal } from '@/lib/onboarding-proposal'

// Lo que Otero entendió de los documentos, antes de pedirle nada al cliente.
// Cada hallazgo dice de qué documento salió: así se puede confiar y corregir.

const ICON: Record<Finding['kind'], LucideIcon> = {
  operacion: Factory, empresa: Building2, lugar: MapPin, certificacion: Award, vencimiento: CalendarClock,
}

function Stat({ value, label, tone = 'ink' }: { value: string; label: string; tone?: 'ink' | 'risk' }) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised p-4">
      <p className={cn('text-display-md tabular-nums', tone === 'risk' ? 'text-risk' : 'text-ink')}>{value}</p>
      <p className="text-caption text-ink-muted">{label}</p>
    </div>
  )
}

export function AnalysisShowcase({ proposal }: { proposal: Proposal }) {
  const { readCount, answered, total, stateList, expiring, findings } = proposal
  const pct = Math.round((answered / total) * 100)
  const sourceText = (sources: string[]) => (sources.length > 2 ? `${sources.slice(0, 2).join(', ')} y ${sources.length - 2} más` : sources.join(', '))

  return (
    <section aria-labelledby="analysis-title" className="space-y-6">
      <header className="space-y-1">
        <h4 id="analysis-title" className="text-heading text-ink">Esto entendió Otero de tu empresa</h4>
        <p className="text-body-sm text-ink-muted">
          Leímos {readCount} {readCount === 1 ? 'documento' : 'documentos'} y ya contestamos {answered} de {total} preguntas de monitoreo.
          En los siguientes pasos lo ves precargado para que lo confirmes o lo corrijas.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat value={String(readCount)} label={readCount === 1 ? 'Documento leído' : 'Documentos leídos'} />
        <Stat value={`${answered}/${total}`} label="Preguntas contestadas" />
        <Stat value={String(stateList.length)} label={stateList.length === 1 ? 'Estado detectado' : 'Estados detectados'} />
        <Stat value={String(expiring.length)} label="Vencidos o por vencer" tone={expiring.length > 0 ? 'risk' : 'ink'} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-caption text-ink-muted">
          <span>Perfil de monitoreo resuelto con tus documentos</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Preguntas contestadas con tus documentos"
          className="h-2 overflow-hidden rounded-pill bg-surface-sunken">
          <div className="h-full rounded-pill bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {findings.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-raised">
          {findings.map((f, i) => {
            const Icon = f.kind === 'operacion' && f.id.includes('agua') ? Droplets : ICON[f.kind]
            return (
              <li key={f.id} style={{ animationDelay: `${Math.min(i, 12) * 70}ms` }}
                className="flex items-start gap-3 px-4 py-3 animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-500">
                <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
                  f.kind === 'vencimiento' ? 'bg-risk-tint text-risk' : 'bg-brand-tint text-brand-text')}>
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-ink">{f.title}</p>
                  <p className="text-caption text-ink-muted">{f.detail}</p>
                  {f.sources.length > 0 && <p className="mt-1 truncate text-caption text-ink-muted">De: {sourceText(f.sources)}</p>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
