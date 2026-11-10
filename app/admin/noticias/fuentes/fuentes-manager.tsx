'use client'

import { useState } from 'react'
import { ExternalLink, Loader2, Pause, Pencil, Play, RotateCw, Search, Trash2 } from 'lucide-react'
import { deleteNewsSource, readNewsSource, setNewsSourceActive, type NewsSourceAdminRow } from '@/app/actions/news-sources'
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Cite, StatusTag } from '@/components/ui/status-tag'
import { MATERIAS } from '@/lib/ingest/categories'
import { SourceForm } from './source-form'

const TZ = 'America/Mexico_City'
const mxDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
const mxWhen = (d: Date | string) => new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })
const mxTime = (d: Date) => d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ })

type StateFilter = 'todas' | 'activas' | 'pausadas' | 'error'

/** Estado de lectura con palabra e ícono, en hora de la Ciudad de México. */
function readState(s: NewsSourceAdminRow) {
  if (!s.active) return <StatusTag status="info" label="Pausada" />
  if (s.lastError) return <StatusTag status="warn" label="No se pudo leer" />
  if (!s.lastCheckedAt) return <StatusTag status="warn" label="Sin leer" />
  const d = new Date(s.lastCheckedAt)
  return mxDay(d) === mxDay(new Date())
    ? <StatusTag status="ok" label={`Leída hoy ${mxTime(d)}`} />
    : <StatusTag status="warn" label={`Leída ${mxWhen(d)}`} />
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-raised p-4 shadow-xs">
      <p className="text-label text-ink-muted">{label}</p>
      <p className={`text-display-md ${tone ?? 'text-ink'}`}>{value}</p>
    </div>
  )
}

export default function FuentesManager({ sources }: { sources: NewsSourceAdminRow[] }) {
  const [list, setList] = useState(sources)
  const [search, setSearch] = useState('')
  const [state, setState] = useState<StateFilter>('todas')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<NewsSourceAdminRow | null>(null)
  const [message, setMessage] = useState<{ id: string; text: string; error?: boolean } | null>(null)

  const replace = (s: NewsSourceAdminRow) => setList(prev => prev.map(x => (x.id === s.id ? s : x)))
  const say = (id: string, text: string, error = false) => setMessage({ id, text, error })

  const failed = list.filter(s => s.active && s.lastError)
  const q = search.trim().toLowerCase()
  const filtered = list.filter(s => {
    if (state === 'activas' && !s.active) return false
    if (state === 'pausadas' && s.active) return false
    if (state === 'error' && !s.lastError) return false
    return !q || [s.name, s.shortName, s.url].some(v => v.toLowerCase().includes(q))
  })

  async function toggle(s: NewsSourceAdminRow) {
    setBusyId(s.id)
    try {
      await setNewsSourceActive(s.id, !s.active)
      replace({ ...s, active: !s.active })
    } catch {
      say(s.id, 'No se pudo cambiar el estado. Intenta de nuevo.', true)
    } finally {
      setBusyId(null)
    }
  }

  async function read(s: NewsSourceAdminRow) {
    setBusyId(s.id)
    setMessage(null)
    try {
      const res = await readNewsSource(s.id)
      if (!res.ok) { say(s.id, res.error, true); return }
      replace(res.source)
      if (res.failed) say(s.id, res.source.lastError ?? 'No se pudo leer la sala de prensa', true)
      else say(s.id, res.newItems === 0 ? 'Sin notas nuevas.' : res.newItems === 1 ? '1 nota nueva en el boletín.' : `${res.newItems} notas nuevas en el boletín.`)
    } catch {
      say(s.id, 'La lectura tardó demasiado o falló. Recarga la página para ver el estado.', true)
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const s = deleting
    setBusyId(s.id)
    try {
      const res = await deleteNewsSource(s.id)
      if (!res.ok) say(s.id, res.error, true)
      else setList(prev => prev.filter(x => x.id !== s.id))
    } catch {
      say(s.id, 'No se pudo eliminar. Intenta de nuevo.', true)
    } finally {
      setBusyId(null)
      setDeleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Fuentes" value={list.length} />
        <Stat label="Activas" value={list.filter(s => s.active).length} tone="text-ok" />
        <Stat label="Pausadas" value={list.filter(s => !s.active).length} />
        <Stat label="Con error" value={failed.length} tone={failed.length ? 'text-warn-text' : 'text-ink'} />
      </div>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6 shadow-xs">
        <div className="flex flex-col gap-1">
          <h2 className="text-heading text-ink">Agregar fuente</h2>
          <p className="text-body-sm text-ink-muted">Pega la página donde la dependencia publica sus comunicados y pulsa Probar URL para ver qué notas tomaría Otero.</p>
        </div>
        <SourceForm primary onSaved={s => setList(prev => [s, ...prev])} />
      </section>

      <section className="flex flex-col gap-4" aria-label="Fuentes registradas">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o URL" aria-label="Buscar fuente" className="pl-8" />
          </div>
          <select value={state} onChange={e => setState(e.target.value as StateFilter)} aria-label="Filtrar por estado"
            className="h-10 rounded-md border border-border-strong bg-surface-raised px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
            <option value="todas">Todos los estados</option>
            <option value="activas">Activas</option>
            <option value="pausadas">Pausadas</option>
            <option value="error">Con error</option>
          </select>
        </div>

        {filtered.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-body-sm text-ink-muted">
            {list.length === 0 ? 'Aún no hay fuentes. Agrega la primera arriba.' : 'Ninguna fuente coincide con los filtros.'}
          </p>
        )}

        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface-raised shadow-xs">
          {filtered.map(s => {
            const busy = busyId === s.id
            return (
              <li key={s.id} className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-body font-medium text-ink">{s.name}</span>
                      <Cite>{s.shortName}</Cite>
                      {readState(s)}
                    </div>
                    <a href={s.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1 text-caption text-ink-muted hover:underline">
                      <span className="truncate">{s.url}</span><ExternalLink aria-hidden className="size-3.5 shrink-0" />
                    </a>
                    <p className="text-caption text-ink-muted">
                      {[
                        s.kind === 'dependencia' ? 'Dependencia' : 'Institución',
                        s.parent ? `de ${s.parent}` : null,
                        MATERIAS[s.materia as keyof typeof MATERIAS] ?? s.materia,
                        s.notes === 1 ? '1 nota' : `${s.notes} notas`,
                        s.lastNoteAt ? `última del ${mxWhen(s.lastNoteAt)}` : null,
                        s.linkFilter ? `filtro ${s.linkFilter}` : null,
                        s.fromCatalog ? 'del catálogo' : 'agregada por el despacho',
                      ].filter(Boolean).join(' · ')}
                    </p>
                    {s.lastError && <p className="text-body-sm text-risk">{s.lastError}{s.lastCheckedAt ? ` · ${mxWhen(s.lastCheckedAt)}` : ''}</p>}
                    {message?.id === s.id && <p role="status" className={`text-body-sm ${message.error ? 'text-risk' : 'text-ok'}`}>{message.text}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => read(s)} disabled={busyId !== null}>
                      {busy ? <Loader2 className="animate-spin" /> : <RotateCw />} Leer ahora
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(editingId === s.id ? null : s.id)} aria-expanded={editingId === s.id}>
                      <Pencil /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => toggle(s)} disabled={busyId !== null}>
                      {s.active ? <><Pause /> Pausar</> : <><Play /> Activar</>}
                    </Button>
                    <Button variant="destructive" size="icon-sm" onClick={() => setDeleting(s)} disabled={busyId !== null || s.fromCatalog}
                      aria-label="Eliminar fuente" title={s.fromCatalog ? 'Las fuentes del catálogo no se eliminan; páusala' : 'Eliminar fuente'}>
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                {editingId === s.id && (
                  <div className="rounded-md border border-border bg-surface p-4">
                    <SourceForm source={s} onCancel={() => setEditingId(null)}
                      onSaved={updated => { replace(updated); setEditingId(null); say(updated.id, 'Cambios guardados.') }} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        {list.some(s => s.fromCatalog) && (
          <p className="text-caption text-ink-muted">Las fuentes del catálogo se pueden editar y pausar, pero no eliminar: Otero las vuelve a dar de alta en cada lectura.</p>
        )}
      </section>

      <AlertDialog open={deleting !== null} onOpenChange={open => { if (!open) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-heading text-ink">Eliminar fuente</AlertDialogTitle>
            <AlertDialogDescription className="text-body-sm text-ink-muted">
              {deleting?.name} deja de leerse y sus {deleting?.notes ?? 0} notas salen del boletín. Los asuntos que tus clientes ya abrieron desde ellas se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmDelete} disabled={busyId !== null}>
              {busyId !== null && <Loader2 className="animate-spin" />} Eliminar fuente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
