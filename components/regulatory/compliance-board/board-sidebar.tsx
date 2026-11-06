'use client'

import { BOARD_VIEWS, type BoardView } from '@/lib/compliance-board'
import { cn } from '@/lib/utils'

type Props = {
  view: BoardView
  counts: Record<BoardView, number>
  onView: (view: BoardView) => void
}

/** Columna izquierda del tablero: las vistas de Mi cumplimiento. */
export function BoardSidebar({ view, counts, onView }: Props) {
  return (
    <aside className="flex flex-col border-b border-border p-4 md:border-r md:border-b-0 md:p-6">
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
