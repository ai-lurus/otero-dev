'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { moveExecution, reassignItem, type BoardItem, type BoardViewer } from '@/app/actions/compliance-board'
import type { TeamMember } from '@/lib/regulatory-items-db'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BOARD_VIEWS, DUE_FILTERS, STAGES, columnsFor, inBoardView, matchesDue, stageLabel, stageOf, viewCount,
  type BoardView, type DueFilter, type Stage,
} from '@/lib/compliance-board'
import { itemFolio } from '@/lib/regulatory'
import { cn } from '@/lib/utils'
import { BoardCard } from './board-card'
import { BoardPanel } from './board-panel'
import { BoardSidebar } from './board-sidebar'
import { BoardToast, type ToastState } from './board-toast'

type Props = { items: BoardItem[]; viewer: BoardViewer; team: TeamMember[] }
type Override = Partial<Pick<BoardItem, 'executionStatus' | 'assigneeId' | 'owner'>>

const ALL = 'todos'

/** Tablero "Mi cumplimiento": los asuntos aceptados, por etapa de ejecución. */
export function ComplianceBoard({ items, viewer, team }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [view, setView] = useState<BoardView>('tablero')
  const [query, setQuery] = useState('')
  const [due, setDue] = useState<DueFilter>('todos')
  const [person, setPerson] = useState(ALL)
  const [openId, setOpenId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, Override>>({})
  const [toast, setToast] = useState<ToastState | null>(null)
  const [error, setError] = useState('')

  // Lo que llega del servidor ya trae los cambios: se descartan los optimistas.
  useEffect(() => setOverrides({}), [items])

  // El admin del cliente es el director; el abogado solo ve lo asignado a él.
  const directorMode = viewer.isDirector

  const current = useMemo(() => items.map((item) => ({ ...item, ...overrides[item.id] })), [items, overrides])

  // Equipo ve lo suyo; Director ve todo, o a una persona si la filtra.
  const scoped = useMemo(() => {
    if (!directorMode) return current.filter((item) => item.assigneeId === viewer.memberId)
    return person === ALL ? current : current.filter((item) => item.assigneeId === person)
  }, [current, directorMode, person, viewer.memberId])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return scoped.filter(
      (item) =>
        matchesDue(item, due) &&
        (!needle || `${item.title} ${item.authority ?? ''} ${itemFolio(item)}`.toLowerCase().includes(needle)),
    )
  }, [scoped, query, due])

  const visible = useMemo(() => filtered.filter((item) => inBoardView(item, view)), [filtered, view])
  const counts = useMemo(
    () => Object.fromEntries(BOARD_VIEWS.map((entry) => [entry.id, viewCount(scoped, entry.id)])) as Record<BoardView, number>,
    [scoped],
  )
  const byStage = useMemo(() => {
    const groups = Object.fromEntries(STAGES.map((stage) => [stage, [] as typeof visible])) as Record<Stage, typeof visible>
    for (const item of visible) groups[stageOf(item)].push(item)
    return groups
  }, [visible])
  const stageTotals = useMemo(
    () => Object.fromEntries(STAGES.map((stage) => [stage, filtered.filter((item) => stageOf(item) === stage).length])) as Record<Stage, number>,
    [filtered],
  )

  const openItem = current.find((item) => item.id === openId) ?? null
  const closeToast = useCallback(() => setToast(null), [])

  const move = (item: BoardItem, to: Stage, undoable = true) => {
    const from = stageOf(item)
    if (from === to) return
    setError('')
    setOverrides((prev) => ({ ...prev, [item.id]: { ...prev[item.id], executionStatus: to } }))
    startTransition(async () => {
      try {
        await moveExecution(item.id, to)
        setToast(
          undoable
            ? { message: `Movido a ${stageLabel(to)}.`, onUndo: () => { setToast(null); move({ ...item, executionStatus: to }, from, false) } }
            : { message: `Regresó a ${stageLabel(to)}.` },
        )
        router.refresh()
      } catch (cause) {
        console.error('moveExecution', item.id, to, cause)
        setOverrides((prev) => ({ ...prev, [item.id]: { ...prev[item.id], executionStatus: from } }))
        setError('No se pudo mover el asunto. Intenta de nuevo.')
      }
    })
  }

  const reassign = (item: BoardItem, memberId: string) => {
    const member = team.find((entry) => entry.id === memberId)
    if (!member || item.assigneeId === memberId) return
    setError('')
    const previous = { assigneeId: item.assigneeId, owner: item.owner }
    setOverrides((prev) => ({ ...prev, [item.id]: { ...prev[item.id], assigneeId: member.id, owner: member.name } }))
    startTransition(async () => {
      try {
        await reassignItem(item.id, member.id)
        setToast({ message: `Reasignado a ${member.name}.` })
        router.refresh()
      } catch (cause) {
        console.error('reassignItem', item.id, memberId, cause)
        setOverrides((prev) => ({ ...prev, [item.id]: { ...prev[item.id], ...previous } }))
        setError('No se pudo reasignar el asunto. Intenta de nuevo.')
      }
    })
  }

  const me = [viewer.name, viewer.position].filter(Boolean).join(' · ')
  const columns = columnsFor(view)

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
      <BoardSidebar
        view={view}
        counts={counts}
        onView={setView}
      />

      <section aria-label="Mi cumplimiento" className="flex min-w-0 flex-col gap-6 p-4 md:p-6">
        <header className="flex flex-col gap-2">
          <p role="heading" aria-level={1} className="text-display-md text-ink">Mi cumplimiento</p>
          <p className="text-body text-ink-muted">
            {directorMode
              ? 'Todos los asuntos que aceptaste, por etapa. Reasigna y marca como cumplido lo que revises.'
              : `Tus asuntos asignados: ${me}. Ejecutas lo que el director ya aceptó.`}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STAGES.map((stage) => (
            <div key={stage} className="flex flex-col gap-1 rounded-lg border border-border bg-surface-raised p-4 shadow-xs">
              <dt className="text-label text-ink-muted">{stageLabel(stage)}</dt>
              <dd className="text-display-md text-ink">{stageTotals[stage]}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64 flex-1">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca un asunto, autoridad o folio" aria-label="Buscar asuntos" className="pl-9" />
          </div>
          <label className="flex items-center gap-2">
            <span className="text-body-sm text-ink-muted">Vencimiento</span>
            <Select value={due} onValueChange={(value) => setDue(value as DueFilter)}>
              <SelectTrigger aria-label="Vencimiento" className="min-w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {DUE_FILTERS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          {directorMode && team.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="text-body-sm text-ink-muted">Responsable</span>
              <Select value={person} onValueChange={setPerson}>
                <SelectTrigger aria-label="Responsable" className="min-w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    {team.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
          )}
          <span className="text-body-sm text-ink-muted">{visible.length} {visible.length === 1 ? 'asunto' : 'asuntos'} en esta vista</span>
        </div>

        {error && <p role="alert" className="text-body-sm text-risk">{error}</p>}

        {scoped.length === 0 ? (
          <Empty className="rounded-lg border border-border bg-surface-raised py-16">
            <EmptyHeader>
              <EmptyTitle>{directorMode ? 'Aún no hay asuntos en ejecución' : 'No tienes asuntos asignados'}</EmptyTitle>
              <EmptyDescription>
                {directorMode
                  ? 'Cuando aceptes un asunto en RegWatch y lo asignes, aparece aquí en Por hacer.'
                  : 'Cuando el director te asigne un asunto, aparece aquí en Por hacer.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className={cn('grid gap-4', columns.length > 1 ? 'md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1')}>
            {columns.map((stage) => (
              <section key={stage} aria-label={stageLabel(stage)} className="flex flex-col gap-3 rounded-lg bg-surface-sunken p-3">
                <header className="flex items-center justify-between px-1">
                  <p role="heading" aria-level={2} className="text-label text-ink">{stageLabel(stage)}</p>
                  <span className="text-caption text-ink-muted">{byStage[stage].length}</span>
                </header>
                {byStage[stage].length === 0 ? (
                  <p className="rounded-md border border-dashed border-border-strong px-3 py-6 text-center text-caption text-ink-muted">Nada en esta columna.</p>
                ) : (
                  <div className={cn('grid gap-3', columns.length === 1 && 'md:grid-cols-2 xl:grid-cols-3')}>
                    {byStage[stage].map((item) => (
                      <BoardCard
                        key={item.id}
                        item={item}
                        isDirector={viewer.isDirector}
                        selected={item.id === openId}
                        busy={isPending}
                        onOpen={() => setOpenId(item.id)}
                        onMove={(to) => move(item, to)}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </section>

      <BoardPanel
        item={openItem}
        viewer={viewer}
        directorMode={directorMode}
        team={team}
        busy={isPending}
        onClose={() => setOpenId(null)}
        onMove={(to) => openItem && move(openItem, to)}
        onReassign={(memberId) => openItem && reassign(openItem, memberId)}
        onEvidenceSaved={() => router.refresh()}
      />

      <BoardToast toast={toast} onClose={closeToast} />
    </div>
  )
}
