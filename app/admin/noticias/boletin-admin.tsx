'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ExternalLink, Eye, EyeOff } from 'lucide-react'
import { hideNewsItems, type NewsAdminRow } from '@/app/actions/news'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const day = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' })

// Las notas que Otero lee de las salas de prensa, tal como las recibe el boletín de los clientes.
export default function BoletinAdmin({ rows }: { rows: NewsAdminRow[] }) {
  const [items, setItems] = useState(rows)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [materia, setMateria] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const sources = useMemo(() => [...new Map(rows.map(r => [r.sourceId, r.source])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [rows])
  const materias = useMemo(() => [...new Map(rows.map(r => [r.materia, r.materiaLabel])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [rows])
  const shown = items.filter(r =>
    (!source || r.sourceId === source) && (!materia || r.materia === materia) &&
    (!search || `${r.title} ${r.summary ?? ''}`.toLowerCase().includes(search.toLowerCase())))

  const toggle = (row: NewsAdminRow) => {
    setError(null)
    start(async () => {
      try {
        await hideNewsItems([row.id], !row.hidden)
        setItems(prev => prev.map(r => r.id === row.id ? { ...r, hidden: !row.hidden } : r))
      } catch {
        setError('No se pudo cambiar la nota. Intenta de nuevo.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en título o entrada" className="max-w-xs" aria-label="Buscar notas" />
        <select value={source} onChange={e => setSource(e.target.value)} aria-label="Fuente" className="h-10 rounded-lg border border-border bg-card px-3 text-body-sm">
          <option value="">Todas las fuentes</option>
          {sources.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select value={materia} onChange={e => setMateria(e.target.value)} aria-label="Materia" className="h-10 rounded-lg border border-border bg-card px-3 text-body-sm">
          <option value="">Todas las materias</option>
          {materias.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <Link href="/admin/noticias/fuentes" className="ml-auto text-body-sm text-brand-text hover:underline">Administrar fuentes</Link>
      </div>
      <p className="text-body-sm text-ink-muted">{shown.length} de {items.length} notas · las ocultas no llegan al boletín de los clientes.</p>
      {error && <p role="alert" className="text-body-sm text-risk">{error}</p>}
      {shown.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-body text-ink-muted">
          {items.length === 0 ? 'Aún no hay notas. Agrega fuentes y pulsa "Leer ahora" en Administrar fuentes.' : 'Ninguna nota coincide con el filtro.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map(r => (
            <li key={r.id} className={`flex items-start gap-4 rounded-xl border border-border bg-card p-4 ${r.hidden ? 'opacity-60' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-muted">{r.source} · {r.materiaLabel} · {day(r.publishedAt)}{r.hidden ? ' · Oculta' : ''}</p>
                <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-start gap-1 text-body font-medium text-ink hover:underline">
                  {r.title}<ExternalLink className="mt-1 size-3.5 shrink-0" aria-hidden />
                </a>
                {r.summary && <p className="mt-1 line-clamp-2 text-body-sm text-ink-muted">{r.summary}</p>}
              </div>
              <Button variant="outline" size="sm" disabled={pending} onClick={() => toggle(r)}>
                {r.hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                {r.hidden ? 'Mostrar' : 'Ocultar'}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
