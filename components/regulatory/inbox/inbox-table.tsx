'use client'

import { Fragment } from 'react'
import type { RegulatoryItem } from '@/app/actions/regulatory-items'
import { Checkbox } from '@/components/ui/checkbox'
import { SCOPE_LABELS } from '@/lib/regulatory'
import { daysUntil, dayHeading, dueShort, itemDay } from '@/lib/inbox'
import { cn } from '@/lib/utils'
import { ImpactPill } from './impact-pill'

export type Group = { key: string; heading: string | null; items: RegulatoryItem[] }

const cell = 'px-3 py-3 align-top'
const head = 'px-3 py-3 text-left text-label text-ink-muted whitespace-nowrap'

const shortDate = (day: string) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(`${day}T00:00:00`)).replace('.', '')

const folio = (item: RegulatoryItem) => `${item.scope === 'legislativo' ? 'LEG' : 'REG'}-${item.id.slice(0, 8).toUpperCase()}`

type Props = {
  groups: Group[]
  selected: Set<string>
  openId: string | null
  onToggle: (id: string) => void
  onToggleAll: (ids: string[], checked: boolean) => void
  onOpen: (id: string) => void
}

export function groupByDay(items: RegulatoryItem[]): Group[] {
  const groups = new Map<string, RegulatoryItem[]>()
  for (const item of items) {
    const day = itemDay(item)
    groups.set(day, [...(groups.get(day) ?? []), item])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, list]) => ({ key: day, heading: dayHeading(day), items: list }))
}

/** Tabla de la bandeja: una fila por asunto, agrupada por día si hay encabezado. */
export function InboxTable({ groups, selected, openId, onToggle, onToggleAll, onOpen }: Props) {
  const allIds = groups.flatMap((group) => group.items.map((item) => item.id))
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id))

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-body-sm text-ink">
        <thead className="bg-surface-sunken">
          <tr>
            <th scope="col" className="w-10 px-3 py-3">
              <Checkbox aria-label="Seleccionar todos" checked={allChecked} onCheckedChange={(checked) => onToggleAll(allIds, checked === true)} />
            </th>
            <th scope="col" className={head}>Fecha</th>
            <th scope="col" className={head}>Fuente</th>
            <th scope="col" className={head}>Impacto</th>
            <th scope="col" className={head}>Asunto · autoridad</th>
            <th scope="col" className={head}>Materia</th>
            <th scope="col" className={head}>Plazo</th>
            <th scope="col" className={head}>Responsable</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              {group.heading && (
                <tr className="border-y border-border bg-surface-sunken">
                  <td colSpan={8} className="px-3 py-2 text-label text-ink">
                    {group.heading} <span className="ml-2 font-normal text-ink-muted">{group.items.length} {group.items.length === 1 ? 'asunto' : 'asuntos'}</span>
                  </td>
                </tr>
              )}
              {group.items.map((item) => {
                const due = dueShort(item.dueDate)
                const days = daysUntil(item.dueDate)
                return (
                  <tr
                    key={item.id}
                    onClick={() => onOpen(item.id)}
                    className={cn('cursor-pointer border-b border-border bg-surface-raised transition-colors hover:bg-surface-sunken', item.id === openId && 'bg-brand-tint hover:bg-brand-tint')}
                  >
                    <td className={cn(cell, 'w-10')} onClick={(event) => event.stopPropagation()}>
                      <Checkbox aria-label={`Seleccionar ${item.title}`} checked={selected.has(item.id)} onCheckedChange={() => onToggle(item.id)} />
                    </td>
                    <td className={cn(cell, 'text-data whitespace-nowrap')}>{shortDate(itemDay(item))}</td>
                    <td className={cell}>
                      <div className="text-data">{item.source}</div>
                      <div className="text-caption whitespace-nowrap text-ink-muted">{folio(item)}</div>
                    </td>
                    <td className={cell}><ImpactPill impact={item.impact} /></td>
                    <td className={cn(cell, 'min-w-64 max-w-md')}>
                      <button type="button" className="text-left font-medium text-ink hover:underline" onClick={(event) => { event.stopPropagation(); onOpen(item.id) }}>
                        {item.title}
                      </button>
                      {item.authority && <div className="text-caption text-ink-muted">{item.authority}</div>}
                    </td>
                    <td className={cell}>
                      <div>{item.materia}</div>
                      <div className="text-caption text-ink-muted">{SCOPE_LABELS[item.scope as keyof typeof SCOPE_LABELS] ?? item.scope}</div>
                    </td>
                    <td className={cn(cell, 'whitespace-nowrap', days !== null && days <= 7 && 'font-medium text-risk')}>{due ?? '—'}</td>
                    <td className={cn(cell, 'whitespace-nowrap')}>{item.owner ?? '—'}</td>
                  </tr>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
