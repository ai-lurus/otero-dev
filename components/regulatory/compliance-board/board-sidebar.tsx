'use client'

import { BOARD_VIEWS, type BoardView } from '@/lib/compliance-board'
import { cn } from '@/lib/utils'

export type BoardMode = 'director' | 'equipo'

type Props = {
  /** Solo el admin del cliente puede cambiar entre Director y Equipo. */
  canSwitch: boolean
  mode: BoardMode
  onMode: (mode: BoardMode) => void
  firstName: string
  view: BoardView
  counts: Record<BoardView, number>
  onView: (view: BoardView) => void
}

/** Columna izquierda del tablero: Ver como y las vistas de Mi cumplimiento. */
export function BoardSidebar({ canSwitch, mode, onMode, firstName, view, counts, onView }: Props) {
  return (
    <aside className="flex flex-col gap-6 border-b border-border p-4 md:border-r md:border-b-0 md:p-6">
      {canSwitch && (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-label text-ink-muted">Ver como</p>
          <div role="group" aria-label="Ver como" className="grid grid-cols-2 overflow-hidden rounded-md border border-ink">
            {(['director', 'equipo'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => onMode(option)}
                className={cn('px-3 py-2 text-body-sm transition-colors', mode === option ? 'bg-ink text-surface' : 'bg-surface-raised text-ink hover:bg-surface-sunken')}
              >
                {option === 'director' ? 'Director' : 'Equipo'}
              </button>
            ))}
          </div>
          <p className="px-1 text-caption text-ink-muted">
            {mode === 'director' ? 'Ves todos los asuntos y puedes reasignarlos.' : `Ves solo lo asignado a ti, ${firstName}.`}
          </p>
        </div>
      )}

      <nav aria-label="Mi cumplimiento" className="flex flex-col gap-1">
        <p className="px-3 text-label text-ink-muted">Mi cumplimiento</p>
        <div className="flex gap-1 overflow-x-auto md:flex-col">
          {BOARD_VIEWS.map((entry) => {
            const active = view === entry.id
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onView(entry.id)}
                aria-current={active || undefined}
                className={cn(
                  'flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-body-sm text-ink transition-colors hover:bg-surface-sunken',
                  active && 'bg-brand-tint font-semibold text-brand-text hover:bg-brand-tint',
                )}
              >
                {entry.label}
                <span className={cn('text-caption', active ? 'text-brand-text' : 'text-ink-muted')}>{counts[entry.id]}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
