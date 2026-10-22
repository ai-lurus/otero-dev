'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, Sparkles, Radio, X } from 'lucide-react'
import type { Post } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<string, string> = {
  ambiental: 'Ambiental', fiscal: 'Fiscal', regulatorio: 'Regulatorio',
  corporativo: 'Corporativo', laboral: 'Laboral', iniciativa: 'Iniciativas',
}
const PRIORITY_LABELS: Record<string, string> = {
  alta: 'Acción requerida', media: 'Anticipación', baja: 'Informativo',
}

const CATEGORY_FILTERS = [
  { value: 'todas', label: 'Todas' },
  { value: 'ambiental', label: 'Ambiental' },
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'regulatorio', label: 'Regulatorio' },
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'laboral', label: 'Laboral' },
  { value: 'iniciativa', label: 'Iniciativas' },
] as const

function priorityBadge(p: string) {
  if (p === 'alta') return 'bg-red-50 text-red-700 border-red-200'
  if (p === 'media') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-secondary text-muted-foreground border-border'
}
function priorityBar(p: string) {
  if (p === 'alta') return 'bg-red-500'
  if (p === 'media') return 'bg-amber-500'
  return 'bg-muted-foreground/30'
}

function relativeTime(d: Date | string) {
  const ms = Date.now() - new Date(d).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `Hace ${Math.max(m, 1)} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `Hace ${h} h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

// ── Detail modal ──────────────────────────────────────────────────
function PostDetail({ post, onClose, onAskCompi }: { post: Post; onClose: () => void; onAskCompi: (post: Post) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-background w-full max-w-md max-h-[92vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <span className="block w-10 h-1 rounded-full bg-muted" />
        </div>
        <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-4 border-b border-border">
          <div className="flex flex-wrap gap-1.5 flex-1">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide', priorityBadge(post.priority))}>
              {PRIORITY_LABELS[post.priority]}
            </span>
            <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{CATEGORY_LABELS[post.category]}</span>
            <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{post.source}</span>
          </div>
          <button onClick={onClose} className="rounded-full bg-secondary p-1.5 text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-5 pb-4">
            <h2 className="font-serif text-xl leading-snug text-balance">{post.title}</h2>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {relativeTime(post.createdAt)} · {new Date(post.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {post.affectsNote && (
            <div className="mx-5 mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Te afecta porque</p>
                <p className="text-sm text-amber-900 mt-0.5">{post.affectsNote}</p>
              </div>
            </div>
          )}

          <div className="px-5 pb-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Resumen</p>
            <p className="text-sm text-foreground/90 leading-relaxed mb-5">{post.summary}</p>
            {post.body && (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Análisis</p>
                <div className="text-sm text-foreground/90 leading-relaxed space-y-3">
                  {post.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-card px-5 py-3 flex gap-2">
          <button onClick={onClose} className="flex-1 text-sm font-medium text-muted-foreground bg-secondary py-2.5 rounded-xl">
            Cerrar
          </button>
          <button
            onClick={() => { onClose(); onAskCompi(post) }}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#1C2B4A] py-2.5 rounded-xl active:scale-[0.98] transition-transform"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Pregúntale a Otero
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function ClienteNoticiasClient({ posts }: { posts: Post[] }) {
  const router = useRouter()
  const [category, setCategory] = useState<string>('todas')
  const [active, setActive] = useState<Post | null>(null)

  function askCompi(post: Post) {
    const q = `¿Cómo me afecta esta noticia? "${post.title}"\n\nResumen: ${post.summary}${post.affectsNote ? `\nNota de impacto: ${post.affectsNote}` : ''}`
    router.push(`/cliente/chat?q=${encodeURIComponent(q)}`)
  }

  const filtered = useMemo(() => {
    if (category === 'todas') return posts
    return posts.filter(p => p.category === category)
  }, [posts, category])

  const counts = useMemo(() => ({
    total: posts.length,
    alta: posts.filter(p => p.priority === 'alta').length,
  }), [posts])

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-[#0d1e35] text-white px-5 pt-5 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-[#8badd4]" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#8badd4]">Radar Regulatorio</span>
        </div>
        <h1 className="font-serif text-2xl leading-tight tracking-tight text-balance">
          Cambios <span className="italic text-[#4ade80]">relevantes</span> para tu operación.
        </h1>
        <p className="text-sm text-white/70 mt-2 leading-relaxed">
          Inteligencia regulatoria curada por nuestro equipo. Solo lo que te afecta.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-5">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="font-serif text-2xl font-semibold">{counts.total}</p>
            <p className="text-[11px] text-white/60 mt-0.5">Publicaciones</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
            <p className="font-serif text-2xl font-semibold text-red-300">{counts.alta}</p>
            <p className="text-[11px] text-red-200/80 mt-0.5">Requieren atención</p>
          </div>
        </div>
      </section>

      {/* Category tabs */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 px-4 py-3 min-w-max">
            {CATEGORY_FILTERS.map(f => (
              <button key={f.value} onClick={() => setCategory(f.value)}
                className={cn('text-xs font-medium px-3 py-1.5 rounded-full transition-colors whitespace-nowrap',
                  category === f.value ? 'bg-[#1C2B4A] text-white' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-3 p-4">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <Sparkles className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {posts.length === 0 ? 'Tu equipo publicará noticias regulatorias aquí próximamente.' : 'Sin publicaciones en esta categoría.'}
            </p>
          </div>
        )}
        {filtered.map(post => (
          <div key={post.id} className="relative bg-card border border-border rounded-2xl overflow-hidden">
            <span className={cn('absolute top-0 left-0 bottom-0 w-1', priorityBar(post.priority))} aria-hidden />
            <button onClick={() => setActive(post)} className="w-full text-left p-4 pl-5 active:scale-[0.99] transition-transform">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide', priorityBadge(post.priority))}>
                    {PRIORITY_LABELS[post.priority]}
                  </span>
                  <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{post.source}</span>
                  <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{CATEGORY_LABELS[post.category]}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {relativeTime(post.createdAt)}
                </span>
              </div>
              <h3 className="font-serif text-[15px] leading-snug text-foreground text-balance">{post.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1.5">{post.summary}</p>
              {post.affectsNote && (
                <div className="mt-3 pt-3 border-t border-dashed border-border flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-foreground/80">
                    <span className="font-semibold">Te afecta:</span> {post.affectsNote}
                  </p>
                </div>
              )}
            </button>
            {/* Compi CTA */}
            <div className="border-t border-border/60 mx-4 mb-3 pt-3 flex justify-end">
              <button
                onClick={() => askCompi(post)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1C2B4A] hover:bg-[#1C2B4A]/5 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Pregúntale a Otero
              </button>
            </div>
          </div>
        ))}
      </div>

      {active && <PostDetail post={active} onClose={() => setActive(null)} onAskCompi={askCompi} />}
    </div>
  )
}
