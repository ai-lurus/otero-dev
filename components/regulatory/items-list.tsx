'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronRight, ExternalLink, LayoutGrid, List, Search } from 'lucide-react'
import type { RegulatoryItem } from '@/app/actions/regulatory-items'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { IMPACTS, IMPACT_LABELS, MATERIAS, SCOPE_LABELS, STAGE_LABELS, STATUSES, STATUS_LABELS } from '@/lib/regulatory'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 15
const IMPACT_STYLE: Record<string, string> = {
  alto: 'bg-risk-tint text-risk',
  medio: 'bg-warn-tint text-warn-text',
  bajo: 'bg-surface-sunken text-ink',
}

const formatDay = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))

/** Solo para el admin: si el asunto sigue en borrador o ya se envió al cliente (con la fecha). */
export function SentBadge({ sentAt }: { sentAt: Date | string | null }) {
  if (!sentAt) return <Badge variant="outline" className="border-dashed">Borrador · no enviado</Badge>
  const day = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(sentAt))
  return <Badge variant="ok">Enviado al cliente · {day}</Badge>
}

export function ImpactBadge({ impact }: { impact: string | null }) {
  if (!impact) return null
  return <Badge className={cn('border-transparent', IMPACT_STYLE[impact])}>{IMPACT_LABELS[impact] ?? impact}</Badge>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="min-h-11 min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="todas">{label}: todas</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

type Props = {
  items: RegulatoryItem[]
  getHref: (item: RegulatoryItem) => string
  showDraft?: boolean
  emptyTitle: string
  emptyDescription: string
}

export function ItemsList({ items, getHref, showDraft, emptyTitle, emptyDescription }: Props) {
  const [scope, setScope] = useState('todas')
  const [materia, setMateria] = useState('todas')
  const [impact, setImpact] = useState('todas')
  const [status, setStatus] = useState('todas')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [view, setView] = useState<'cards' | 'table'>('cards')

  const counts = useMemo(
    () => ({
      todas: items.length,
      regulatorio: items.filter((item) => item.scope === 'regulatorio').length,
      legislativo: items.filter((item) => item.scope === 'legislativo').length,
    }),
    [items],
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return items.filter(
      (item) =>
        (scope === 'todas' || item.scope === scope) &&
        (materia === 'todas' || item.materia === materia) &&
        (impact === 'todas' || item.impact === impact) &&
        (status === 'todas' || item.status === status) &&
        (!term || `${item.title} ${item.description} ${item.authority ?? ''} ${item.subtema ?? ''}`.toLowerCase().includes(term)),
    )
  }, [items, scope, materia, impact, status, query])

  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setVisible(PAGE_SIZE)
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={scope} onValueChange={reset(setScope)}>
        <TabsList className="h-11 w-full">
          {(['todas', 'regulatorio', 'legislativo'] as const).map((value) => (
            <TabsTrigger key={value} value={value} className="min-h-9 flex-1 gap-1.5">
              {value === 'todas' ? 'Todos' : SCOPE_LABELS[value]}
              <span className="text-xs text-muted-foreground">{counts[value]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => reset(setQuery)(event.target.value)}
          placeholder="Buscar por título, autoridad o tema"
          aria-label="Buscar asuntos"
          className="min-h-11 pl-9 text-base"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
        <FilterSelect label="Materia" value={materia} onChange={reset(setMateria)} options={MATERIAS.map((value) => ({ value, label: value }))} />
        <FilterSelect label="Impacto" value={impact} onChange={reset(setImpact)} options={IMPACTS.map((value) => ({ value, label: IMPACT_LABELS[value] }))} />
        <FilterSelect label="Estado" value={status} onChange={reset(setStatus)} options={STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))} />
        </div>
        <ToggleGroup type="single" value={view} onValueChange={(value) => value && setView(value as 'cards' | 'table')} variant="outline" aria-label="Vista de asuntos" className="self-start">
          <ToggleGroupItem value="cards" aria-label="Vista de tarjetas"><LayoutGrid data-icon="inline-start" />Tarjetas</ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Vista de tabla"><List data-icon="inline-start" />Tabla</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {filtered.length === 0 ? (
        <Empty className="rounded-xl border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>{items.length === 0 ? emptyTitle : 'Sin resultados'}</EmptyTitle>
            <EmptyDescription>{items.length === 0 ? emptyDescription : 'Cambia los filtros o la búsqueda.'}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
        {view === 'table' ? (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[42%]">Asunto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Impacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Abrir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, visible).map((item) => {
                  const row = (
                    <>
                      <TableCell className="max-w-0"><div className="truncate font-medium">{item.title}</div><div className="truncate text-xs text-muted-foreground">{item.authority ?? item.materia}</div></TableCell>
                      <TableCell><Badge variant="outline">{SCOPE_LABELS[item.scope as keyof typeof SCOPE_LABELS] ?? item.scope}</Badge></TableCell>
                      <TableCell><ImpactBadge impact={item.impact} /></TableCell>
                      <TableCell><div className="flex flex-wrap gap-1"><Badge variant="secondary">{STATUS_LABELS[item.status] ?? item.status}</Badge>{showDraft && <SentBadge sentAt={item.sentAt} />}</div></TableCell>
                      <TableCell className="text-right"><ChevronRight className="ml-auto size-4 text-muted-foreground" /></TableCell>
                    </>
                  )
                  return <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.assign(getHref(item))}>{row}</TableRow>
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
        <ul className="flex flex-col gap-3">
          {filtered.slice(0, visible).map((item) => {
            const body = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{SCOPE_LABELS[item.scope as keyof typeof SCOPE_LABELS] ?? item.scope}</Badge>
                    <ImpactBadge impact={item.impact} />
                    <Badge variant="secondary">{STATUS_LABELS[item.status] ?? item.status}</Badge>
                    {showDraft && <SentBadge sentAt={item.sentAt} />}
                  </div>
                  <h2 className="item-title max-w-full" title={item.title}>{item.title}</h2>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {item.materia}
                    {item.instrumentType ? ` · ${item.instrumentType}` : ''}
                    {item.authority ? ` · ${item.authority}` : ''}
                  </p>
                  {item.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {item.stage && <span>{STAGE_LABELS[item.stage] ?? item.stage}</span>}
                    {item.publishedAt && (
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />Publicado {formatDay(item.publishedAt)}</span>
                    )}
                    {item.dueDate && <span>Fecha relevante {formatDay(item.dueDate)}</span>}
                    {item.generatesObligation && <span className="font-medium text-foreground">Genera obligaciones</span>}
                  </div>
                </div>
                <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
              </>
            )
            const className = 'flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 sm:p-5'
            return (
              <li key={item.id}>
                <Link href={getHref(item)} className={className}>{body}</Link>
              </li>
            )
          })}
        </ul>
        )}
        </>
      )}

      {filtered.length > visible && (
        <Button variant="outline" className="min-h-11 self-center" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
          Mostrar más ({filtered.length - visible})
        </Button>
      )}
    </div>
  )
}

export function SourceLink({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline">
      Ver fuente oficial <ExternalLink className="size-4" />
    </a>
  )
}
