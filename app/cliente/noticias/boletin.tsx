'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { BookOpen, FilePlus2, FileCheck2, Newspaper } from 'lucide-react'
import { createItemFromNews, type NewsCard } from '@/app/actions/news'
import { Button } from '@/components/ui/button'
import { Cite, StatusTag } from '@/components/ui/status-tag'
import { cn } from '@/lib/utils'

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' })
const citeDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Mexico_City' })
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

/** Botón "Crear asunto" (admin del cliente) o "Ver asunto" si ya existe. */
export function CreateItemButton({ newsId, itemId: initial, canCreate, size = 'sm' }: { newsId: string; itemId: string | null; canCreate: boolean; size?: 'sm' | 'default' }) {
  const [itemId, setItemId] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function create() {
    setError(null)
    start(async () => {
      try {
        setItemId((await createItemFromNews(newsId)).itemId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo crear el asunto')
      }
    })
  }

  if (itemId) {
    return (
      <Button asChild variant="outline" size={size}>
        <Link href={`/cliente/obligaciones/${itemId}?from=cumplimiento`}><FileCheck2 aria-hidden /> Ver asunto</Link>
      </Button>
    )
  }
  if (!canCreate) return null
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size={size} onClick={create} disabled={pending}>
        <FilePlus2 aria-hidden /> {pending ? 'Creando asunto…' : 'Crear asunto'}
      </Button>
      {error ? <p role="alert" className="text-body-sm text-risk">{error}</p> : null}
    </div>
  )
}

function NewsRow({ card, canCreate }: { card: NewsCard; canCreate: boolean }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-6 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        {card.reason ? <StatusTag status="info" label="Aplica a tu empresa" /> : null}
        <span className="text-label text-ink-muted">{card.materiaLabel}</span>
        <Cite>{card.source} {citeDate(card.publishedAt)}</Cite>
      </div>
      <h3 className="text-heading text-ink text-balance"><Link href={`/cliente/noticias/${card.id}`} className="hover:underline">{card.title}</Link></h3>
      {card.summary ? <p className="text-body text-ink line-clamp-4">{card.summary}</p> : null}
      {card.reason ? <p className="text-body-sm text-ink-muted">Aplica porque: {card.reason}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/cliente/noticias/${card.id}`}><BookOpen aria-hidden /> Abrir noticia</Link>
        </Button>
        <CreateItemButton newsId={card.id} itemId={card.itemId} canCreate={canCreate} />
      </div>
    </article>
  )
}

export default function Boletin({ cards, canCreate }: { cards: NewsCard[]; canCreate: boolean }) {
  const forYou = useMemo(() => cards.filter(c => c.reason), [cards])
  const [onlyMine, setOnlyMine] = useState(forYou.length > 0)
  const shown = onlyMine ? forYou : cards

  const days = useMemo(() => {
    const groups = new Map<string, NewsCard[]>()
    for (const c of shown) groups.set(dayKey(c.publishedAt!), [...(groups.get(dayKey(c.publishedAt!)) ?? []), c])
    return [...groups.values()]
  }, [shown])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar boletín">
        {([['Para tu empresa', true, forYou.length], ['Todas', false, cards.length]] as const).map(([label, value, n]) => (
          <button
            key={label}
            type="button"
            aria-pressed={onlyMine === value}
            onClick={() => setOnlyMine(value)}
            className={cn(
              'rounded-pill border px-3 py-1 text-label transition-colors',
              onlyMine === value ? 'border-ink bg-ink text-surface' : 'border-border-strong text-ink hover:bg-surface-sunken',
            )}
          >
            {label} · {n}
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-12 text-center">
          <Newspaper aria-hidden className="size-6 text-ink-muted" />
          <p className="text-body text-ink-muted">
            {cards.length === 0 ? 'Aún no hay noticias. Otero revisa las salas de prensa varias veces al día.' : 'Nada nuevo para tu empresa en los últimos 30 días. Revisa Todas.'}
          </p>
        </div>
      ) : days.map(group => (
        <section key={dayKey(group[0].publishedAt!)} className="flex flex-col gap-4">
          <h3 className="text-label uppercase tracking-wide text-ink-muted">{dayLabel(group[0].publishedAt!)}</h3>
          {group.map(card => <NewsRow key={card.id} card={card} canCreate={canCreate} />)}
        </section>
      ))}
    </div>
  )
}
