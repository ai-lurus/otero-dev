'use client'

import { cn } from '@/lib/utils'
import { SuggestedTag } from '@/components/onboarding/suggested-tag'
import {
  EMPLOYEE_RANGES, ESTADOS, SCIAN_SECTORS, SCIAN_SUBSECTORS, TRIGGERS, sectorOf,
  type MonitoringFields, type TriggerKey, type Triggers,
} from '@/lib/monitoring-profile'

// Paso "Qué vigila Otero" del alta. Controlado: el asistente guarda todo al final.

export const fieldClass = 'w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-body-sm text-ink'
export const labelClass = 'text-label text-ink'

const chip = (on: boolean) =>
  cn('rounded-pill border px-3 py-1 text-label transition-colors',
    on ? 'border-ink bg-ink text-surface' : 'border-border text-ink hover:bg-surface-sunken')

/** Lo que Otero propuso desde los documentos y el cliente aún no ha tocado. */
export type MonitoringSuggestions = {
  scian?: string[]
  states?: string[]
  triggers?: Partial<Record<TriggerKey, string[]>>
}

type Props = { value: MonitoringFields; onChange: (next: MonitoringFields) => void; suggestions?: MonitoringSuggestions }

export function MonitoringStep({ value, onChange, suggestions }: Props) {
  const sector = sectorOf(value.scian) ?? ''
  const subsector = value.scian && value.scian.length === 3 ? value.scian : ''
  const states = value.stateList ?? []
  const triggers: Triggers = value.triggers ?? {}
  const subsectors = SCIAN_SUBSECTORS.filter(s => s.sector === sector)
  const set = (patch: Partial<MonitoringFields>) => onChange({ ...value, ...patch })
  const toggleState = (s: string) => set({ stateList: states.includes(s) ? states.filter(v => v !== s) : [...states, s] })

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="ob-sector">Sector SCIAN</label>
          {suggestions?.scian && <SuggestedTag sources={suggestions.scian} />}
          <select id="ob-sector" className={fieldClass} value={sector} onChange={e => set({ scian: e.target.value || null })}>
            <option value="">Elige un sector</option>
            {SCIAN_SECTORS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
        </div>
        {subsectors.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className={labelClass} htmlFor="ob-subsector">Subsector (opcional)</label>
            <select id="ob-subsector" className={fieldClass} value={subsector} onChange={e => set({ scian: e.target.value || sector })}>
              <option value="">Sin especificar</option>
              {subsectors.map(s => <option key={s.code} value={s.code}>{s.code} · {s.label}</option>)}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="ob-employees">Personas que trabajan ahí</label>
          <select id="ob-employees" className={fieldClass} value={value.employees ?? ''} onChange={e => set({ employees: e.target.value || null })}>
            <option value="">Sin especificar</option>
            {EMPLOYEE_RANGES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </section>

      <section className="space-y-3">
        <p className={labelClass}>Estados donde operas <span className="text-ink-muted">({states.length})</span></p>
        {suggestions?.states && <SuggestedTag sources={suggestions.states} />}
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map(s => (
            <button key={s} type="button" aria-pressed={states.includes(s)} onClick={() => toggleState(s)} className={chip(states.includes(s))}>{s}</button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className={labelClass}>Tu operación</p>
        <div className="divide-y divide-border rounded-lg border border-border bg-surface-raised">
          {TRIGGERS.map(t => (
            <div key={t.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-body-sm text-ink">{t.label}</p>
                {'hint' in t && t.hint && <p className="text-caption text-ink-muted">{t.hint}</p>}
                {suggestions?.triggers?.[t.key] && (
                  <p className="mt-1 text-caption text-brand-text">
                    Sugerido por tus documentos · De: {suggestions.triggers[t.key]!.slice(0, 2).join(', ')}{suggestions.triggers[t.key]!.length > 2 ? ` y ${suggestions.triggers[t.key]!.length - 2} más` : ''}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {t.options.map(o => (
                  <button key={o.value} type="button" aria-pressed={triggers[t.key] === o.value}
                    onClick={() => set({ triggers: { ...triggers, [t.key]: o.value } })} className={chip(triggers[t.key] === o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
