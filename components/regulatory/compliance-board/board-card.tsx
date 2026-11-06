'use client'

import { ArrowLeft, ArrowRight, CalendarClock, FileCheck2, User } from 'lucide-react'
import type { BoardItem } from '@/app/actions/compliance-board'
import { Button } from '@/components/ui/button'
import { BandTag } from '@/components/regulatory/inbox/band-tag'
import { canMoveTo, nextStage, prevStage, stageLabel, stageOf, type Stage } from '@/lib/compliance-board'
import { bandOf, daysUntil, dueShort } from '@/lib/inbox'
import { itemFolio } from '@/lib/regulatory'
import { LEGAL_OBJECTS, isLegalObject } from '@/lib/legal-objects'
import { cn } from '@/lib/utils'

type Props = {
  item: BoardItem
  isDirector: boolean
  selected: boolean
  busy: boolean
  onOpen: () => void
  onMove: (to: Stage) => void
}

export const generatesObligation = (item: BoardItem) => item.obligationsStatus === 'si' || item.generatesObligation

/** Objetos legales del asunto para las etiquetas de la tarjeta ("Obligación", "Plazo"), sin repetir y hasta tres. */
function objectLabels(item: BoardItem) {
  const labels = (item.objects ?? []).filter((object) => isLegalObject(object.tipo) && LEGAL_OBJECTS[object.tipo].family !== 'sin_accion')
    .map((object) => LEGAL_OBJECTS[object.tipo].label)
  if (!labels.length && generatesObligation(item)) labels.push(LEGAL_OBJECTS.obligacion.label)
  return [...new Set(labels)].slice(0, 3)
}

/** Tarjeta de un asunto en el tablero: prioridad, plazo, responsable y el paso siguiente. */
export function BoardCard({ item, isDirector, selected, busy, onOpen, onMove }: Props) {
  const stage = stageOf(item)
  const next = nextStage(stage)
  const prev = prevStage(stage)
  const days = daysUntil(item.dueDate)
  const due = dueShort(item.dueDate)
  const overdue = stage !== 'cumplido' && days !== null && days < 0
  const lockedNext = next !== null && !canMoveTo(next, isDirector)
  const lockedPrev = stage === 'cumplido' && !isDirector

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-xs transition-shadow hover:shadow-sm',
        selected && 'border-ink',
      )}
    >
      <button type="button" onClick={onOpen} className="flex flex-col gap-2 rounded-md text-left">
        <span className="text-body-sm font-medium text-ink">{item.title}</span>
        <span className="flex flex-col gap-1">
          <span className="text-data text-ink-muted">{itemFolio(item)}</span>
          {item.authority && <span className="line-clamp-2 text-caption text-ink-muted">{item.authority}</span>}
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <BandTag band={bandOf(item)} />
        {objectLabels(item).map((label) => (
          <span key={label} className="inline-flex items-center gap-1 rounded-pill bg-surface-sunken px-2.5 py-1 text-label text-ink">
            <FileCheck2 aria-hidden className="size-3.5" />
            {label}
          </span>
        ))}
      </div>

      <dl className="flex flex-col gap-1 text-caption text-ink-muted">
        {due && (
          <div className={cn('flex items-center gap-1', overdue && 'text-risk')}>
            <CalendarClock aria-hidden className="size-3.5" />
            <dt className="sr-only">Plazo</dt>
            <dd>{due}</dd>
          </div>
        )}
        <div className="flex items-center gap-1">
          <User aria-hidden className="size-3.5" />
          <dt className="sr-only">Responsable</dt>
          <dd>{item.owner ?? 'Sin responsable'}</dd>
        </div>
      </dl>

      {(prev || next) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {prev && (
            <Button variant="ghost" size="sm" disabled={busy || lockedPrev} onClick={() => onMove(prev)}>
              <ArrowLeft aria-hidden />
              Regresar
            </Button>
          )}
          {next && (
            <Button variant="outline" size="sm" className="ml-auto" disabled={busy || lockedNext} onClick={() => onMove(next)}>
              Pasar a {stageLabel(next)}
              <ArrowRight aria-hidden />
            </Button>
          )}
          {lockedNext && <p className="w-full text-caption text-ink-muted">El director lo marca como cumplido al revisarlo.</p>}
        </div>
      )}
    </article>
  )
}
