'use client'

import type { RegulatoryItem } from '@/app/actions/regulatory-items'
import { Checkbox } from '@/components/ui/checkbox'
import { familyCounts } from '@/lib/legal-objects'
import { bandOf, daysUntil, dueShort, itemDay } from '@/lib/inbox'
import { cn } from '@/lib/utils'
import { BandTag } from './band-tag'

const cell = 'px-3 py-3 align-top'
const head = 'px-3 py-3 text-left text-label text-ink-muted whitespace-nowrap'

const shortDate = (day: string) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(`${day}T00:00:00`)).replace('.', '')

type Props = {
  /** Ya vienen ordenados por prioridad. */
  items: RegulatoryItem[]
  /** Muestra las casillas de selección para actuar sobre varios asuntos. */
  selectable: boolean
  /** Responsable solo tiene sentido cuando ya hay asuntos aceptados; en la bandeja siempre estaría vacío. */
  showOwner: boolean
  selected: Set<string>
  openId: string | null
  onToggle: (id: string) => void
  onToggleAll: (ids: string[], checked: boolean) => void
  onOpen: (id: string) => void
}

/** Tabla de la bandeja: una fila por asunto, lo más importante primero. */
export function InboxTable({ items, selectable, showOwner, selected, openId, onToggle, onToggleAll, onOpen }: Props) {
  const allIds = items.map((item) => item.id)
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id))

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[48rem] border-collapse text-body-sm text-ink">
        <thead className="bg-surface-sunken">
          <tr>
            <th scope="col" className="w-10 px-3 py-3">
              {selectable && <Checkbox aria-label="Seleccionar todos" checked={allChecked} onCheckedChange={(checked) => onToggleAll(allIds, checked === true)} />}
            </th>
            <th scope="col" className={head}>Prioridad</th>
            <th scope="col" className={head}>Asunto</th>
            <th scope="col" className={head}>Materia</th>
            <th scope="col" className={head}>Objetos</th>
            <th scope="col" className={head}>Plazo</th>
            {showOwner && <th scope="col" className={head}>Responsable</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const due = dueShort(item.dueDate)
            const days = daysUntil(item.dueDate)
            const objects = familyCounts(item.objects)
            return (
              <tr
                key={item.id}
                onClick={() => onOpen(item.id)}
                className={cn('cursor-pointer border-b border-border bg-surface-raised transition-colors hover:bg-surface-sunken', item.id === openId && 'bg-brand-tint hover:bg-brand-tint')}
              >
                <td className={cn(cell, 'w-10')} onClick={(event) => event.stopPropagation()}>
                  {selectable && <Checkbox aria-label={`Seleccionar ${item.title}`} checked={selected.has(item.id)} onCheckedChange={() => onToggle(item.id)} />}
                </td>
                <td className={cell}><BandTag band={bandOf(item)} /></td>
                <td className={cn(cell, 'min-w-64 max-w-md')}>
                  <button type="button" className="text-left font-medium text-ink hover:underline" onClick={(event) => { event.stopPropagation(); onOpen(item.id) }}>
                    {item.title}
                  </button>
                  <div className="text-caption text-ink-muted">
                    {[item.source, shortDate(itemDay(item)), item.authority].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className={cell}>{item.materia}</td>
                <td className={cn(cell, 'whitespace-nowrap')}>
                  {objects.map((entry) => (
                    <div key={entry.family}>{entry.label} <span className="text-ink-muted">{entry.n}</span></div>
                  ))}
                  {!objects.length && <span className="text-ink-muted">—</span>}
                </td>
                <td className={cn(cell, 'whitespace-nowrap', days !== null && days <= 7 && 'font-medium text-risk')}>{due ?? '—'}</td>
                {showOwner && <td className={cn(cell, 'whitespace-nowrap')}>{item.owner ?? '—'}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
