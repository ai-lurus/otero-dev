'use client'

import { useState, useTransition } from 'react'
import { setNewsSourceActive } from '@/app/actions/news'
import { Button } from '@/components/ui/button'
import { Cite } from '@/components/ui/status-tag'

type Source = {
  id: string; name: string; shortName: string; url: string; kind: string
  active: boolean; lastCheckedAt: Date | null; lastError: string | null; notes: number
}

const when = (d: Date | null) => (d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' }) : 'Sin leer')

export default function FuentesManager({ sources }: { sources: Source[] }) {
  const [list, setList] = useState(sources)
  const [pending, start] = useTransition()

  function toggle(id: string, active: boolean) {
    setList(prev => prev.map(s => (s.id === id ? { ...s, active } : s)))
    start(async () => { await setNewsSourceActive(id, active) })
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface-raised shadow-xs">
      {list.map(s => (
        <li key={s.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <a href={s.url} target="_blank" rel="noreferrer" className="text-body font-medium text-ink hover:underline">{s.name}</a>
            <div className="flex flex-wrap items-center gap-2 text-caption text-ink-muted">
              <Cite>{s.shortName}</Cite>
              <span>{s.kind === 'dependencia' ? 'Dependencia' : 'Institución'}</span>
              <span>{s.notes} notas</span>
              <span>Última lectura: {when(s.lastCheckedAt)}</span>
            </div>
            {s.lastError ? <p className="text-caption text-risk">{s.lastError}</p> : null}
          </div>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => toggle(s.id, !s.active)}>
            {s.active ? 'Pausar fuente' : 'Activar fuente'}
          </Button>
        </li>
      ))}
    </ul>
  )
}
