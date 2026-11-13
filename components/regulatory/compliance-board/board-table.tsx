'use client'

import { ArrowRight } from 'lucide-react'
import type { BoardItem } from '@/app/actions/compliance-board'
import { Button } from '@/components/ui/button'
import { BandTag } from '@/components/regulatory/inbox/band-tag'
import { canMoveTo, nextStage, stageLabel, stageOf, type Stage } from '@/lib/compliance-board'
import { bandOf, daysUntil, dueShort } from '@/lib/inbox'
import { itemFolio } from '@/lib/regulatory'
import { cn } from '@/lib/utils'

const cell = 'px-3 py-3 align-top'
const head = 'px-3 py-3 text-left text-label text-ink-muted whitespace-nowrap'

type Props = {
  /** Ya vienen ordenados: etapa, luego plazo más cercano. */
  items: BoardItem[]
  isDirector: boolean
  openId: string | null
  busy: boolean
  onOpen: (id: string) => void
  onMove: (item: BoardItem, to: Stage) => void
}

/** Vista de lista de Mi cumplimiento: una fila por asunto, con su etapa y el paso siguiente. */
export function BoardTable({ items, isDirector, openId, busy, onOpen, onMove }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-body-sm text-ink">
          <thead className="bg-surface-sunken">
            <tr>
              <th scope="col" className={head}>Prioridad</th>
              <th scope="col" className={head}>Asunto</th>
              <th scope="col" className={head}>Etapa</th>
              <th scope="col" className={head}>Plazo</th>
              <th scope="col" className={head}>Responsable</th>
              <th scope="col" className={head}><span className="sr-only">Acción</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const stage = stageOf(item)
              const next = nextStage(stage)
              const days = daysUntil(item.dueDate)
              const due = dueShort(item.dueDate)
              const overdue = stage !== 'cumplido' && days !== null && days < 0
              return (
                <tr
                  key={item.id}
                  onClick={() => onOpen(item.id)}
                  className={cn('cursor-pointer border-b border-border bg-surface-raised transition-colors hover:bg-surface-sunken', item.id === openId && 'bg-brand-tint hover:bg-brand-tint')}
                >
                  <td className={cell}><BandTag band={bandOf(item)} /></td>
                  <td className={cn(cell, 'min-w-64 max-w-md')}>
                    <button type="button" className="text-left font-medium text-ink hover:underline" onClick={(event) => { event.stopPropagation(); onOpen(item.id) }}>
                      {item.title}
                    </button>
                    <div className="text-caption text-ink-muted">{[itemFolio(item), item.authority].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className={cn(cell, 'whitespace-nowrap')}>{stageLabel(stage)}</td>
                  <td className={cn(cell, 'whitespace-nowrap', overdue && 'font-medium text-risk')}>{due ?? '—'}</td>
                  <td className={cn(cell, 'whitespace-nowrap')}>{item.owner ?? 'Sin responsable'}</td>
                  <td className={cn(cell, 'whitespace-nowrap text-right')} onClick={(event) => event.stopPropagation()}>
                    {next && (
                      <Button variant="outline" size="sm" disabled={busy || !canMoveTo(next, isDirector)} onClick={() => onMove(item, next)}>
                        Pasar a {stageLabel(next)}
                        <ArrowRight aria-hidden />
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
