'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { acceptAndAssign, updateItemStatus, type AssignableMember, type RegulatoryItem } from '@/app/actions/regulatory-items'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { VIEWS, compareInbox, daysUntil, inView, type ViewId } from '@/lib/inbox'
import { LEGAL_OBJECTS, OBJECT_FAMILIES, isLegalObject } from '@/lib/legal-objects'
import { IMPACTS, IMPACT_LABELS, MATERIAS } from '@/lib/regulatory'
import { cn } from '@/lib/utils'
import { AssigneeSelect } from './assignee-select'
import { InboxPanel } from './inbox-panel'
import { InboxTable, groupByDay, type Group } from './inbox-table'

const ALL = 'todas'
const SOURCES = [
  { value: ALL, label: 'Todas' },
  { value: 'DOF', label: 'DOF' },
  { value: 'PIGR', label: 'PIGR' },
]

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-body-sm text-ink-muted">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value={ALL}>Todos</SelectItem>
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

function StatCard({ value, label, active, onClick }: { value: number; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex flex-col gap-1 rounded-lg border bg-surface-raised p-4 text-left transition-colors hover:bg-surface-sunken', active ? 'border-ink' : 'border-border')}
    >
      <span className="text-display-md text-ink">{value}</span>
      <span className="text-body-sm text-ink-muted">{label}</span>
    </button>
  )
}

type Props = { items: RegulatoryItem[]; members: AssignableMember[] }

/** Bandeja de RegWatch: vistas a la izquierda, tabla de asuntos agrupada por día y el asunto abierto en un panel lateral. */
export function Inbox({ items, members }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [view, setView] = useState<ViewId>('bandeja')
  const [source, setSource] = useState(ALL)
  const [impact, setImpact] = useState(ALL)
  const [materia, setMateria] = useState(ALL)
  const [family, setFamily] = useState(ALL)
  const [grouped, setGrouped] = useState(true)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [discarding, setDiscarding] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [assignee, setAssignee] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter(
      (item) =>
        (source === ALL || item.source.toUpperCase().includes(source)) &&
        (impact === ALL || item.impact === impact) &&
        (materia === ALL || item.materia === materia) &&
        (family === ALL || (item.objects ?? []).some((object) => isLegalObject(object.tipo) && LEGAL_OBJECTS[object.tipo].family === family)) &&
        (!needle || `${item.title} ${item.authority ?? ''} ${item.materia} ${item.id}`.toLowerCase().includes(needle)),
    )
  }, [items, source, impact, materia, family, query])

  const counts = useMemo(
    () => Object.fromEntries(VIEWS.map((entry) => [entry.id, filtered.filter((item) => inView(item, entry.id)).length])),
    [filtered],
  )
  const unreviewed = useMemo(() => items.filter((item) => item.origin === 'regwatch' && item.status === 'identificada'), [items])
  const stats = {
    pending: unreviewed.length,
    high: unreviewed.filter((item) => item.impact === 'alto').length,
    soon: unreviewed.filter((item) => {
      const days = daysUntil(item.dueDate)
      return days !== null && days <= 7
    }).length,
  }

  const visible = useMemo(() => filtered.filter((item) => inView(item, view)), [filtered, view])
  const groups: Group[] = useMemo(() => {
    if (grouped) {
      return groupByDay(visible).map((group) => ({ ...group, items: [...group.items].sort((a, b) => compareInbox(a, b)) }))
    }
    return [{ key: 'todos', heading: null, items: [...visible].sort((a, b) => compareInbox(a, b)) }]
  }, [visible, grouped])

  const openItem = items.find((item) => item.id === openId) ?? null
  const viewLabel = VIEWS.find((entry) => entry.id === view)?.label ?? ''
  const selectedIds = [...selected].filter((id) => visible.some((item) => item.id === id))

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = (ids: string[], checked: boolean) => setSelected(checked ? new Set(ids) : new Set())
  const resetBulk = () => {
    setSelected(new Set())
    setDiscarding(false)
    setAssigning(false)
    setAssignee('')
    setReason('')
    setError('')
  }

  const assignSelected = () => {
    if (!assignee) return
    setError('')
    startTransition(async () => {
      try {
        await Promise.all(selectedIds.map((id) => acceptAndAssign(id, assignee)))
        resetBulk()
        router.refresh()
      } catch (cause) {
        console.error('assignSelected', cause)
        setError('No se pudieron asignar todos los asuntos. Intenta de nuevo.')
        router.refresh()
      }
    })
  }

  const decideSelected = (status: string, why?: string) => {
    setError('')
    startTransition(async () => {
      try {
        await Promise.all(selectedIds.map((id) => updateItemStatus(id, status, why)))
        resetBulk()
        router.refresh()
      } catch (cause) {
        console.error('decideSelected', status, cause)
        setError('No se pudieron actualizar todos los asuntos. Intenta de nuevo.')
        router.refresh()
      }
    })
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-border p-4 md:border-r md:border-b-0 md:p-6">
        <nav aria-label="RegWatch" className="-mx-1 flex flex-col gap-1 md:mx-0">
          <p className="px-3 text-label text-ink-muted">RegWatch</p>
          <div className="flex gap-1 overflow-x-auto md:flex-col">
            {VIEWS.filter((entry) => !entry.history && !('own' in entry)).map((entry) => (
              <ViewButton key={entry.id} active={view === entry.id} label={entry.label} count={counts[entry.id]} onClick={() => { setView(entry.id); resetBulk() }} />
            ))}
          </div>
          <p className="mt-2 px-3 text-label text-ink-muted">Historial</p>
          <div className="flex gap-1 overflow-x-auto md:flex-col">
            {VIEWS.filter((entry) => entry.history).map((entry) => (
              <ViewButton key={entry.id} active={view === entry.id} label={entry.label} count={counts[entry.id]} onClick={() => { setView(entry.id); resetBulk() }} />
            ))}
          </div>
          <p className="mt-2 px-3 text-label text-ink-muted">Despacho</p>
          <div className="flex gap-1 overflow-x-auto md:flex-col">
            {VIEWS.filter((entry) => 'own' in entry).map((entry) => (
              <ViewButton key={entry.id} active={view === entry.id} label={entry.label} count={counts[entry.id]} onClick={() => { setView(entry.id); resetBulk() }} />
            ))}
          </div>
        </nav>
      </aside>

      <section aria-label={viewLabel} className="flex min-w-0 flex-col gap-6 p-4 md:p-6">
        <header className="flex flex-col gap-2">
          <p role="heading" aria-level={1} className="text-display-md text-ink">{viewLabel}</p>
          <p className="text-body-sm text-ink-muted">
            {view === 'despacho' ? 'Asuntos que tu despacho capturó a mano.' : 'RegWatch · asuntos que Otero generó al cruzar la ingesta con tu empresa. Aceptas o descartas; lo aceptado pasa a seguimiento.'}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard value={stats.pending} label="sin revisar" active={view === 'bandeja'} onClick={() => setView('bandeja')} />
          <StatCard value={stats.high} label="de impacto alto sin revisar" active={view === 'impacto_alto'} onClick={() => setView('impacto_alto')} />
          <StatCard value={stats.soon} label="sin revisar vencen en 7 días" active={view === 'vencen_7'} onClick={() => setView('vencen_7')} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca asunto, autoridad, materia o folio" aria-label="Buscar asuntos" className="pl-9" />
          </div>
          <div role="group" aria-label="Fuente" className="inline-flex overflow-hidden rounded-md border border-ink">
            {SOURCES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={source === option.value}
                onClick={() => setSource(option.value)}
                className={cn('px-4 py-2 text-body-sm transition-colors', source === option.value ? 'bg-ink text-surface' : 'bg-surface-raised text-ink hover:bg-surface-sunken')}
              >
                {option.label}
              </button>
            ))}
          </div>
          <FilterSelect label="Impacto" value={impact} onChange={setImpact} options={IMPACTS.map((value) => ({ value, label: IMPACT_LABELS[value].replace('Impacto ', '') }))} />
          <FilterSelect label="Materia" value={materia} onChange={setMateria} options={MATERIAS.map((value) => ({ value, label: value }))} />
          <FilterSelect label="Objeto" value={family} onChange={setFamily} options={Object.entries(OBJECT_FAMILIES).filter(([key]) => key !== 'sin_accion').map(([value, label]) => ({ value, label }))} />
          <label className="flex items-center gap-2">
            <span className="text-body-sm text-ink-muted">Agrupar</span>
            <Select value={grouped ? 'dia' : 'ninguno'} onValueChange={(value) => setGrouped(value === 'dia')}>
              <SelectTrigger aria-label="Agrupar" className="min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="dia">Por día</SelectItem>
                  <SelectItem value="ninguno">Sin agrupar</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        </div>

        <p className="text-body-sm text-ink-muted">
          {visible.length} {visible.length === 1 ? 'asunto' : 'asuntos'} en esta vista. Abre un asunto para decidir.
        </p>

        {selectedIds.length > 0 && (
          <div role="region" aria-label="Acciones para los seleccionados" className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-body-sm text-ink">{selectedIds.length} {selectedIds.length === 1 ? 'seleccionado' : 'seleccionados'}</span>
              <div className="ml-auto flex flex-wrap gap-3">
                <Button variant="ghost" disabled={isPending} onClick={resetBulk}>Quitar selección</Button>
                <Button variant="ghost" disabled={isPending} onClick={() => decideSelected('archivada')}>Archivar</Button>
                <Button variant="outline" disabled={isPending} onClick={() => setDiscarding(true)}>Descartar</Button>
                <Button disabled={isPending} onClick={() => (members.length ? setAssigning(true) : decideSelected('aceptada'))}>Atender</Button>
              </div>
            </div>
            {assigning && (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <AssigneeSelect members={members} value={assignee} onChange={setAssignee} />
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" disabled={isPending} onClick={() => { setAssigning(false); setAssignee('') }}>Cancelar</Button>
                  <Button disabled={isPending || !assignee} onClick={assignSelected}>Aceptar y asignar</Button>
                </div>
              </div>
            )}
            {discarding && (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <label className="flex flex-col gap-1">
                  <span className="text-label text-ink-muted">Motivo para descartarlos</span>
                  <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Por ejemplo: no aplica a nuestras instalaciones" />
                </label>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" disabled={isPending} onClick={() => { setDiscarding(false); setReason('') }}>Cancelar</Button>
                  <Button variant="destructive" disabled={isPending || !reason.trim()} onClick={() => decideSelected('descartada', reason)}>Descartar asuntos</Button>
                </div>
              </div>
            )}
            {error && <p role="alert" className="text-body-sm text-risk">{error}</p>}
          </div>
        )}

        {visible.length === 0 ? (
          <Empty className="rounded-lg border border-border bg-surface-raised py-16">
            <EmptyHeader>
              <EmptyTitle>{items.length ? 'No hay asuntos aquí' : 'Aún no hay asuntos'}</EmptyTitle>
              <EmptyDescription>
                {items.length
                  ? 'Cambia de vista o ajusta los filtros.'
                  : 'Cuando Otero o tu despacho identifiquen un asunto que te afecte, llegará a esta bandeja.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <InboxTable groups={groups} selected={selected} openId={openId} onToggle={toggle} onToggleAll={toggleAll} onOpen={setOpenId} />
          </div>
        )}
      </section>

      <InboxPanel item={openItem} members={members} onClose={() => setOpenId(null)} />
    </div>
  )
}
