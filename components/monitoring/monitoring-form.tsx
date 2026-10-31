'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { MATERIAS, MATERIA_KEYS } from '@/lib/ingest/categories'
import {
  EMPLOYEE_RANGES, ESTADOS, PROFILE_STATUS_LABELS, SCIAN_SECTORS, SCIAN_SUBSECTORS, TRIGGERS,
  profileStatus, sectorOf, type MonitoringFields, type Triggers,
} from '@/lib/monitoring-profile'

// Formulario del perfil de monitoreo. Lo usan el admin del despacho (con
// materias contratadas) y el admin del cliente (para corregir y confirmar).

const MONITORED = MATERIA_KEYS.filter(m => m !== 'otra')
const field = 'rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20'
const label = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

type Props = {
  initial: MonitoringFields | null
  /** El despacho elige las materias; el cliente solo las ve. */
  materiasEditable: boolean
  /** Muestra el botón de confirmar (admin del cliente). */
  canConfirm?: boolean
  onSave: (values: MonitoringFields, confirm: boolean) => Promise<void>
}

export function MonitoringForm({ initial, materiasEditable, canConfirm = false, onSave }: Props) {
  const [sector, setSector] = useState(sectorOf(initial?.scian) ?? '')
  const [subsector, setSubsector] = useState(initial?.scian && initial.scian.length === 3 ? initial.scian : '')
  const [states, setStates] = useState<string[]>(initial?.stateList ?? [])
  const [triggers, setTriggers] = useState<Triggers>(initial?.triggers ?? {})
  const [employees, setEmployees] = useState((EMPLOYEE_RANGES as readonly string[]).includes(initial?.employees ?? '') ? initial!.employees! : '')
  const [materias, setMaterias] = useState<string[]>(initial?.materias ?? [])
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const subsectors = SCIAN_SUBSECTORS.filter(s => s.sector === sector)
  const values: MonitoringFields = { scian: subsector || sector || null, stateList: states, triggers, employees: employees || null, materias }
  const status = profileStatus(values)

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter(v => v !== value) : [...list, value]
  }

  function submit(confirm: boolean) {
    setMessage(null)
    startTransition(async () => {
      try {
        await onSave(values, confirm)
        setMessage({ ok: true, text: confirm ? 'Perfil confirmado' : 'Perfil guardado' })
      } catch (e) {
        setMessage({ ok: false, text: e instanceof Error ? e.message : 'No se pudo guardar' })
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold',
          status === 'completo' ? 'bg-ok-tint text-ok' : status === 'incompleto' ? 'bg-warn-tint text-warn-text' : 'bg-surface-sunken text-muted-foreground')}>
          {PROFILE_STATUS_LABELS[status]}
        </span>
        {status !== 'completo' && <span className="text-xs text-muted-foreground">Mientras no esté completo, RegWatch solo envía lo general (fiscal, laboral, datos personales, corporativo, anticorrupción).</span>}
      </div>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Actividad</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="mp-sector">Sector SCIAN</label>
            <select id="mp-sector" className={field} value={sector} onChange={e => { setSector(e.target.value); setSubsector('') }}>
              <option value="">Elige un sector</option>
              {SCIAN_SECTORS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
          {subsectors.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className={label} htmlFor="mp-subsector">Subsector (opcional)</label>
              <select id="mp-subsector" className={field} value={subsector} onChange={e => setSubsector(e.target.value)}>
                <option value="">Sin especificar</option>
                {subsectors.map(s => <option key={s.code} value={s.code}>{s.code} · {s.label}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className={label} htmlFor="mp-employees">Empleados</label>
            <select id="mp-employees" className={field} value={employees} onChange={e => setEmployees(e.target.value)}>
              <option value="">Sin especificar</option>
              {EMPLOYEE_RANGES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Estados donde opera <span className="font-normal text-muted-foreground">({states.length})</span></p>
        <div className="flex flex-wrap gap-1.5">
          {ESTADOS.map(s => (
            <button key={s} type="button" onClick={() => setStates(toggle(states, s))}
              className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors',
                states.includes(s) ? 'border-ink bg-ink text-surface' : 'border-border text-foreground hover:bg-surface-sunken')}>
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Operación</p>
        <div className="divide-y divide-border rounded-xl border border-border">
          {TRIGGERS.map(t => (
            <div key={t.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{t.label}</p>
                {'hint' in t && t.hint && <p className="text-xs text-muted-foreground">{t.hint}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {t.options.map(o => (
                  <button key={o.value} type="button" onClick={() => setTriggers({ ...triggers, [t.key]: o.value })}
                    className={cn('rounded-lg border px-2.5 py-1 text-xs transition-colors',
                      triggers[t.key] === o.value ? 'border-ink bg-ink text-surface' : 'border-border text-foreground hover:bg-surface-sunken')}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Materias que vigila el despacho</p>
        {materiasEditable ? (
          <>
            <p className="text-xs text-muted-foreground">Sin ninguna marcada, se le vigilan todas.</p>
            <div className="flex flex-wrap gap-1.5">
              {MONITORED.map(m => (
                <button key={m} type="button" onClick={() => setMaterias(toggle(materias, m))}
                  className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors',
                    materias.includes(m) ? 'border-ink bg-ink text-surface' : 'border-border text-foreground hover:bg-surface-sunken')}>
                  {MATERIAS[m]}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {materias.length ? materias.map(m => MATERIAS[m as keyof typeof MATERIAS] ?? m).join(', ') : 'Todas las materias'}
          </p>
        )}
      </section>

      {message && (
        <p className={cn('rounded-lg border px-4 py-2 text-xs', message.ok ? 'border-ok/30 bg-ok-tint text-ok' : 'border-risk/30 bg-risk-tint text-risk')}>{message.text}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={isPending} onClick={() => submit(false)}
          className={cn('rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50 transition-opacity',
            canConfirm ? 'border border-border hover:bg-surface-sunken' : 'bg-foreground text-background hover:opacity-90')}>
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>
        {canConfirm && (
          <button type="button" disabled={isPending || status !== 'completo'} onClick={() => submit(true)}
            className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 transition-opacity">
            Confirmar perfil
          </button>
        )}
      </div>
    </div>
  )
}
