'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { RegulatoryItem } from '@/app/actions/regulatory-items'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BANDS, BAND_LABELS, VIEWS, bandOf, compareInbox, inView, type ViewId } from '@/lib/inbox'
import { MATERIAS, SCOPES, SCOPE_LABELS } from '@/lib/regulatory'
import { cn } from '@/lib/utils'
import { InboxPanel } from './inbox-panel'
import { InboxRow } from './inbox-row'

const ALL = 'todas'

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label text-ink-muted">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={ALL}>Todas</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
}

function ViewButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active || undefined}
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-body-sm text-ink transition-colors hover:bg-surface-sunken',
        active && 'bg-brand-tint font-medium text-brand-text hover:bg-brand-tint',
      )}
    >
      {label}
      <span className="text-caption text-ink-muted">{count}</span>
    </button>
  )
}

type Props = { items: RegulatoryItem[] }

/** Bandeja tipo correo: carpetas y filtros a la izquierda, asuntos por prioridad y el asunto abierto en un panel lateral. */
export function Inbox({ items }: Props) {
  const [view, setView] = useState<ViewId>('bandeja')
  const [scope, setScope] = useState(ALL)
  const [materia, setMateria] = useState(ALL)
  const [band, setBand] = useState(ALL)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const matchesFilters = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (item: RegulatoryItem) =>
      (scope === ALL || item.scope === scope) &&
      (materia === ALL || item.materia === materia) &&
      (band === ALL || bandOf(item) === band) &&
      (!needle || `${item.title} ${item.description} ${item.source}`.toLowerCase().includes(needle))
  }, [scope, materia, band, query])

  const filtered = useMemo(() => items.filter(matchesFilters), [items, matchesFilters])
  const counts = useMemo(
    () => Object.fromEntries(VIEWS.map((entry) => [entry.id, filtered.filter((item) => inView(item, entry.id)).length])),
    [filtered],
  )
  const visible = useMemo(
    () => filtered.filter((item) => inView(item, view)).sort((a, b) => compareInbox(a, b)),
    [filtered, view],
  )
  const openItem = items.find((item) => item.id === openId) ?? null
  const viewLabel = VIEWS.find((entry) => entry.id === view)?.label.split(' · ')[0] ?? ''

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-6 border-b border-border p-4 md:border-r md:border-b-0 md:p-6">
        <nav aria-label="RegWatch" className="-mx-1 flex flex-col gap-1 md:mx-0">
          <p className="px-3 text-label text-ink-muted">RegWatch</p>
          <div className="flex gap-1 overflow-x-auto md:flex-col">
            {VIEWS.filter((entry) => !entry.history).map((entry) => (
              <ViewButton key={entry.id} active={view === entry.id} label={entry.label} count={counts[entry.id]} onClick={() => setView(entry.id)} />
            ))}
          </div>
          <p className="mt-2 px-3 text-label text-ink-muted">Historial</p>
          <div className="flex gap-1 overflow-x-auto md:flex-col">
            {VIEWS.filter((entry) => entry.history).map((entry) => (
              <ViewButton key={entry.id} active={view === entry.id} label={entry.label} count={counts[entry.id]} onClick={() => setView(entry.id)} />
            ))}
          </div>
        </nav>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <FilterSelect label="Prioridad" value={band} onChange={setBand} options={BANDS.map((value) => ({ value, label: BAND_LABELS[value] }))} />
          <FilterSelect label="Tipo" value={scope} onChange={setScope} options={SCOPES.map((value) => ({ value, label: SCOPE_LABELS[value] }))} />
          <div className="col-span-2 md:col-span-1">
            <FilterSelect label="Materia" value={materia} onChange={setMateria} options={MATERIAS.map((value) => ({ value, label: value }))} />
          </div>
        </div>
      </aside>

      <section aria-label={viewLabel} className="flex min-w-0 flex-col">
        <header className="flex flex-col gap-4 border-b border-border p-4 md:px-6 md:py-6">
          <div className="flex items-baseline justify-between gap-3">
            <p role="heading" aria-level={1} className="text-display-md text-ink">{viewLabel}</p>
            <span className="text-caption text-ink-muted">{visible.length} {visible.length === 1 ? 'asunto' : 'asuntos'}</span>
          </div>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca por título, resumen o fuente" aria-label="Buscar asuntos" className="pl-9" />
          </div>
        </header>

        {visible.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyTitle>{items.length ? 'No hay asuntos aquí' : 'Aún no hay asuntos'}</EmptyTitle>
              <EmptyDescription>
                {items.length
                  ? 'Cambia de carpeta o ajusta los filtros.'
                  : 'Cuando Otero o tu despacho identifiquen un asunto que te afecte, llegará a esta bandeja.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul>
            {visible.map((item) => (
              <InboxRow key={item.id} item={item} selected={item.id === openId} onOpen={() => setOpenId(item.id)} />
            ))}
          </ul>
        )}
      </section>

      <InboxPanel item={openItem} onClose={() => setOpenId(null)} />
    </div>
  )
}
