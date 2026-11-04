import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getNewsDetail } from '@/app/actions/news'
import { getSession } from '@/app/actions/auth-helpers'
import { Cite, StatusTag } from '@/components/ui/status-tag'
import { CreateItemButton } from '../boletin'

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' })
const citeDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Mexico_City' })

export default async function NoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  const { id } = await params
  const detail = await getNewsDetail(id).catch(() => null)
  if (!detail) notFound()
  const { card, canCreate } = detail

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Link href="/cliente/noticias" className="inline-flex items-center gap-1 text-body-sm text-brand-text hover:underline">
        <ArrowLeft aria-hidden className="size-4" /> Volver a Noticias
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {card.reason ? <StatusTag status="info" label="Te toca" /> : null}
          <span className="text-label text-ink-muted">{card.materiaLabel}</span>
          <Cite>{card.source} {citeDate(card.publishedAt)}</Cite>
        </div>
        <p role="heading" aria-level={1} className="text-display-md text-ink text-balance">{card.title}</p>
        <p className="text-caption text-ink-muted">{card.authority} · {longDate(card.publishedAt)}</p>
      </header>

      {card.summary ? <p className="text-body-lg text-ink">{card.summary}</p> : (
        <p className="text-body text-ink-muted">Esta nota no trae resumen. Léela completa en el sitio de la institución.</p>
      )}

      <section className="flex flex-col gap-1 rounded-lg border border-border bg-surface-raised p-6 shadow-xs">
        <h3 className="text-heading text-ink">{card.reason ? 'Te toca porque' : 'Por ahora no te toca'}</h3>
        <p className="text-body text-ink-muted">
          {card.reason ?? `Con el perfil de monitoreo de tu empresa, ${card.materiaLabel.toLowerCase()} no se activa. Si tu operación cambió, actualiza tu perfil.`}
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href={card.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-body-sm font-medium text-brand-text hover:underline">
          <ExternalLink aria-hidden className="size-4" /> Leer en {card.source}
        </a>
        <CreateItemButton newsId={card.id} itemId={card.itemId} canCreate={canCreate} size="default" />
      </div>
    </article>
  )
}
