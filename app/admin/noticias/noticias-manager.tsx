'use client'

import { useState, useTransition, useOptimistic } from 'react'
import { Plus, Search, Pencil, Trash2, Eye, X, Clock, Sparkles, Globe, EyeOff } from 'lucide-react'
import { createPost, updatePost, deletePost, togglePublish } from '@/app/actions/posts'
import type { Post } from '@/lib/db/schema'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const CATEGORIES = ['ambiental', 'fiscal', 'regulatorio', 'corporativo', 'laboral', 'iniciativa'] as const
const CATEGORY_LABELS: Record<string, string> = {
  ambiental: 'Ambiental', fiscal: 'Fiscal', regulatorio: 'Regulatorio',
  corporativo: 'Corporativo', laboral: 'Laboral', iniciativa: 'Iniciativas',
}
const PRIORITY_LABELS: Record<string, string> = {
  alta: 'Acción requerida', media: 'Anticipación', baja: 'Informativo',
}

function priorityBar(p: string) {
  if (p === 'alta') return 'bg-risk'
  if (p === 'media') return 'bg-warn'
  return 'bg-muted-foreground/30'
}
function priorityBadge(p: string) {
  if (p === 'alta') return 'bg-risk-tint text-risk border-risk/30'
  if (p === 'media') return 'bg-warn-tint text-warn-text border-warn/30'
  return 'bg-secondary text-muted-foreground border-border'
}

function relativeTime(d: Date | string) {
  const ms = Date.now() - new Date(d).getTime()
  const days = Math.floor(ms / 86400000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── StatCard ──────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'red' | 'amber' | 'green' }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn('font-serif text-3xl font-semibold mt-1',
        accent === 'red' ? 'text-risk' : accent === 'amber' ? 'text-warn-text' : accent === 'green' ? 'text-ok' : 'text-foreground'
      )}>{value}</p>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}{required && <span className="text-risk ml-1">*</span>}
      </label>
      {hint && <p className="text-[11px] text-muted-foreground mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

// ── PostForm ──────────────────────────────────────────────────────
type FormData = {
  title: string; body: string; summary: string
  category: string; priority: string; source: string
  affectsNote: string; published: boolean
}

const EMPTY_FORM: FormData = {
  title: '', body: '', summary: '', category: 'regulatorio',
  priority: 'media', source: 'DOF', affectsNote: '', published: false,
}

function PostFormModal({ initial, onClose, onSave }: {
  initial?: Post
  onClose: () => void
  onSave: (data: FormData) => Promise<void>
}) {
  const [form, setForm] = useState<FormData>(initial ? {
    title: initial.title, body: initial.body, summary: initial.summary,
    category: initial.category, priority: initial.priority,
    source: initial.source, affectsNote: initial.affectsNote ?? '',
    published: initial.published,
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.summary.trim()) return
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-2xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col " onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-xl font-semibold">{initial ? 'Editar publicación' : 'Nueva publicación'}</h2>
          <button onClick={onClose} className="rounded-full bg-secondary p-1.5 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-5">
            {/* Meta row */}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Prioridad">
                <select value={form.priority} onChange={set('priority')} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40">
                  <option value="alta">Acción requerida</option>
                  <option value="media">Anticipación</option>
                  <option value="baja">Informativo</option>
                </select>
              </Field>
              <Field label="Categoría">
                <select value={form.category} onChange={set('category')} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </Field>
              <Field label="Fuente" hint="DOF, SAT, SEMARNAT…">
                <input value={form.source} onChange={set('source')} placeholder="DOF" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40" />
              </Field>
            </div>

            <Field label="Título" required>
              <input value={form.title} onChange={set('title')} placeholder="Nueva regulación que afecta a…" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40" />
            </Field>

            <Field label="Resumen ejecutivo" hint="1-2 líneas. Aparece en el feed del cliente." required>
              <textarea value={form.summary} onChange={set('summary')} rows={2} placeholder="Qué cambia, plazo y consecuencia principal." className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40 resize-none" />
            </Field>

            <Field label="Análisis completo" hint="Texto detallado visible al abrir la nota.">
              <textarea value={form.body} onChange={set('body')} rows={6} placeholder="Contexto, implicaciones y recomendaciones…" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40 resize-none leading-relaxed" />
            </Field>

            <Field label="Nota de impacto al cliente" hint="Por qué les afecta esto directamente. Opcional.">
              <input value={form.affectsNote} onChange={set('affectsNote')} placeholder="Por ejemplo: sus permisos de operación dependen de…" className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40" />
            </Field>

            {/* Publish toggle */}
            <button type="button" onClick={() => setForm(f => ({ ...f, published: !f.published }))}
              className="w-full flex items-center justify-between border border-border rounded-xl px-4 py-3 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-2.5">
                {form.published
                  ? <Globe className="w-4 h-4 text-ok" />
                  : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm font-semibold">{form.published ? 'Publicado — visible para clientes' : 'Borrador — no visible aún'}</span>
              </div>
              <div className={cn('w-10 h-6 rounded-full transition-colors relative', form.published ? 'bg-ok' : 'bg-border')}>
                <span className={cn('absolute top-0.5 w-5 h-5 bg-surface-raised rounded-full  transition-all', form.published ? 'left-[18px]' : 'left-0.5')} />
              </div>
            </button>

            {error && <p className="text-xs text-risk">{error}</p>}
          </div>

          <div className="sticky bottom-0 border-t border-border bg-background px-6 py-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 text-sm font-medium text-muted-foreground bg-secondary py-2.5 rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !form.title.trim() || !form.summary.trim()}
              className="flex-1 text-sm font-semibold text-surface bg-ink py-2.5 rounded-xl disabled:opacity-40 flex items-center justify-center gap-2">
              {saving && <Spinner />}
              {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear publicación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────
function DeleteModal({ post, onCancel, onConfirm, pending }: {
  post: Post; onCancel: () => void; onConfirm: () => void; pending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-2xl p-6 ">
        <div className="w-10 h-10 rounded-full bg-risk-tint flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-risk" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-center">Eliminar publicación</h3>
        <p className="text-sm text-muted-foreground text-center mt-2">
          <span className="font-medium text-foreground">&ldquo;{post.title}&rdquo;</span> se eliminará permanentemente.
        </p>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 text-sm font-medium bg-secondary py-2.5 rounded-xl">Cancelar</button>
          <button onClick={onConfirm} disabled={pending} className="flex-1 text-sm font-semibold text-surface bg-risk py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {pending && <Spinner />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PreviewModal ──────────────────────────────────────────────────
function PreviewModal({ post, onClose }: { post: Post; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-lg max-h-[90vh] rounded-2xl overflow-hidden flex flex-col " onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa del cliente</span>
          <button onClick={onClose} className="rounded-full bg-secondary p-1.5 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide', priorityBadge(post.priority))}>
              {PRIORITY_LABELS[post.priority]}
            </span>
            <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{CATEGORY_LABELS[post.category]}</span>
            <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{post.source}</span>
          </div>
          <h2 className="font-serif text-xl leading-snug">{post.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{post.summary}</p>
          {post.affectsNote && (
            <div className="rounded-xl bg-warn-tint border border-warn/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-warn-text mb-1">Te afecta porque</p>
              <p className="text-sm text-warn-text">{post.affectsNote}</p>
            </div>
          )}
          {post.body && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Análisis</p>
              <div className="text-sm leading-relaxed space-y-3">
                {post.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function NoticiasManager({ initialPosts }: { initialPosts: Post[] }) {
  const [optimisticPosts, setOptimisticPosts] = useOptimistic(initialPosts)
  const [, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Post | null>(null)
  const [deleting, setDeleting] = useState<Post | null>(null)
  const [preview, setPreview] = useState<Post | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const filtered = optimisticPosts.filter(p => {
    const q = search.trim().toLowerCase()
    return !q || p.title.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q) || p.source.toLowerCase().includes(q)
  })

  const counts = {
    total: optimisticPosts.length,
    published: optimisticPosts.filter(p => p.published).length,
    alta: optimisticPosts.filter(p => p.priority === 'alta').length,
    drafts: optimisticPosts.filter(p => !p.published).length,
  }

  async function handleCreate(data: FormData) {
    const tempId = `temp-${Date.now()}`
    startTransition(() => {
      setOptimisticPosts(prev => [{
        id: tempId, ...data, authorId: null,
        createdAt: new Date(), updatedAt: new Date(),
        affectsNote: data.affectsNote || null,
      } as Post, ...prev])
    })
    await createPost(data)
  }

  async function handleUpdate(id: string, data: FormData) {
    startTransition(() => {
      setOptimisticPosts(prev => prev.map(p => p.id === id ? { ...p, ...data, affectsNote: data.affectsNote || null } : p))
    })
    await updatePost(id, data)
  }

  async function handleTogglePublish(post: Post) {
    startTransition(() => {
      setOptimisticPosts(prev => prev.map(p => p.id === post.id ? { ...p, published: !p.published } : p))
    })
    await togglePublish(post.id, !post.published)
  }

  async function handleDelete() {
    if (!deleting) return
    setDeletePending(true)
    const id = deleting.id
    startTransition(() => {
      setOptimisticPosts(prev => prev.filter(p => p.id !== id))
    })
    setDeleting(null)
    setDeletePending(false)
    await deletePost(id)
  }

  return (
    <div className="min-h-full p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Noticias y Radar Regulatorio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Publica notas sobre NOMs, DOF y cambios regulatorios que verán todos los clientes.</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-surface hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Nueva nota
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total notas" value={counts.total} />
        <StatCard label="Publicadas" value={counts.published} accent="green" />
        <StatCard label="Acción requerida" value={counts.alta} accent="red" />
        <StatCard label="Borradores" value={counts.drafts} accent="amber" />
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por título, resumen o fuente…"
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none" />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Sparkles className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Sin publicaciones. Crea la primera nota.</p>
          </div>
        )}
        {filtered.map(post => (
          <article key={post.id} className="relative bg-card border border-border rounded-2xl p-5 overflow-hidden">
            <span className={cn('absolute top-0 left-0 bottom-0 w-1', priorityBar(post.priority))} aria-hidden />
            <div className="ml-2 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide', priorityBadge(post.priority))}>
                    {PRIORITY_LABELS[post.priority]}
                  </span>
                  <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{CATEGORY_LABELS[post.category]}</span>
                  <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{post.source}</span>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', post.published ? 'bg-ok-tint text-ok' : 'bg-secondary text-muted-foreground')}>
                    {post.published ? 'Publicado' : 'Borrador'}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {relativeTime(post.createdAt)}
                  </span>
                </div>
                <h3 className="font-serif text-base leading-snug text-foreground">{post.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2">{post.summary}</p>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => setPreview(post)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary px-3 py-1.5 rounded-lg transition-colors">
                  <Eye className="w-3.5 h-3.5" /> Ver
                </button>
                <button onClick={() => handleTogglePublish(post)}
                  className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                    post.published ? 'text-warn-text hover:bg-warn-tint' : 'text-ok hover:bg-ok-tint')}>
                  {post.published ? <EyeOff className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                  {post.published ? 'Ocultar' : 'Publicar'}
                </button>
                <button onClick={() => setEditing(post)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary px-3 py-1.5 rounded-lg transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => setDeleting(post)}
                  className="flex items-center gap-1.5 text-xs font-medium text-risk hover:bg-risk-tint px-3 py-1.5 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Modals */}
      {creating && (
        <PostFormModal onClose={() => setCreating(false)} onSave={handleCreate} />
      )}
      {editing && (
        <PostFormModal initial={editing} onClose={() => setEditing(null)}
          onSave={data => handleUpdate(editing.id, data)} />
      )}
      {preview && <PreviewModal post={preview} onClose={() => setPreview(null)} />}
      {deleting && (
        <DeleteModal post={deleting} onCancel={() => setDeleting(null)}
          onConfirm={handleDelete} pending={deletePending} />
      )}
    </div>
  )
}
