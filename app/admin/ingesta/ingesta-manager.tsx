'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CalendarSearch, CheckCircle2, ExternalLink, FilePlus2, FileText, Globe, Link2, Loader2, Play, RotateCw, Search, Trash2, Upload, X } from 'lucide-react'
import { addSiteSource, addUrlSource, checkSite, deleteIngestSource, processSource, type IngestSourceRow } from '@/app/actions/ingest'
import { generateObligations, getObligationTargets, type GenerateResult, type ObligationTarget } from '@/app/actions/ingest-obligations'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '@/lib/upload-rules'
import { MATERIAS, VIGENCIAS } from '@/lib/ingest/categories'
import { decodeEntities } from '@/lib/ingest/title'
import { cn } from '@/lib/utils'

const ACCEPT = [...ALLOWED_UPLOAD_TYPES].join(',')

const STATUS_LABELS: Record<string, string> = {
  en_cola: 'En cola', procesando: 'Procesando', lista: 'Lista', error: 'Error',
}
function statusBadge(s: string) {
  if (s === 'lista') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (s === 'procesando') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (s === 'error') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── StatCard ──────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'red' | 'amber' | 'green' }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn('font-serif text-3xl font-semibold mt-1',
        accent === 'red' ? 'text-red-700' : accent === 'amber' ? 'text-amber-700' : accent === 'green' ? 'text-emerald-700' : 'text-foreground'
      )}>{value}</p>
    </div>
  )
}

// ── Alta por URL ──────────────────────────────────────────────────
function UrlForm({ onAdded }: { onAdded: (s: IngestSourceRow) => void }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await addUrlSource({ url, title })
      if (!res.ok) { setError(res.error); return }
      onAdded(res.source)
      setUrl('')
      setTitle('')
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.dof.gob.mx/…" inputMode="url"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título (opcional)"
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40" />
        <button type="submit" disabled={saving || !url.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#1C2B4A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Agregar enlace
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  )
}

// ── Alta por archivo ──────────────────────────────────────────────
type PendingUpload = { key: string; name: string; error?: string }

function FileDrop({ onAdded }: { onAdded: (s: IngestSourceRow) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploads, setUploads] = useState<PendingUpload[]>([])

  async function uploadOne(file: File) {
    const key = `${file.name}-${Date.now()}-${Math.random()}`
    const fail = (error: string) => setUploads(u => u.map(x => x.key === key ? { ...x, error } : x))
    setUploads(u => [...u, { key, name: file.name }])
    if (file.size > MAX_UPLOAD_BYTES) return fail('Pesa más de 25 MB')
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) return fail('Tipo de archivo no permitido')
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/ingesta/upload', { method: 'POST', body })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return fail(json.error ?? 'No se pudo subir')
      onAdded(json.source)
      setUploads(u => u.filter(x => x.key !== key))
    } catch {
      fail('No se pudo subir')
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) await uploadOne(file)
  }

  return (
    <div className="space-y-3">
      <button type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        className={cn('w-full rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          dragging ? 'border-[#c42a6d] bg-[#c42a6d]/5' : 'border-border hover:bg-secondary/40')}>
        <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Arrastra archivos aquí o haz clic para elegirlos</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, CSV, TXT o imagen. Hasta 25 MB cada uno.</p>
      </button>
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
      {uploads.length > 0 && (
        <ul className="space-y-1.5">
          {uploads.map(u => (
            <li key={u.key} className="flex items-center gap-2 text-xs">
              {u.error ? <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" /> : <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
              <span className="truncate">{u.name}</span>
              {u.error && <span className="text-red-600 shrink-0">· {u.error}</span>}
              {u.error && (
                <button onClick={() => setUploads(x => x.filter(y => y.key !== u.key))} aria-label="Quitar" className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Alta de sitio recurrente ──────────────────────────────────────
function SiteForm({ hasSite, onAdded }: { hasSite: boolean; onAdded: (s: IngestSourceRow) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    setSaving(true)
    setError('')
    try {
      const res = await addSiteSource({ url: 'https://dof.gob.mx/' })
      if (!res.ok) { setError(res.error); return }
      onAdded(res.source)
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Registra el Diario Oficial de la Federación: con <strong>Revisar ahora</strong> Otero lee el sumario del día y
        agrega cada publicación como una fuente nueva, sin repetir las que ya tiene.
      </p>
      <button onClick={handleAdd} disabled={saving || hasSite}
        className="flex items-center gap-2 rounded-xl bg-[#1C2B4A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
        {hasSite ? 'Diario Oficial ya registrado' : 'Registrar Diario Oficial'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
}

// Títulos guardados antes de decodificar entidades HTML (&oacute;) se limpian al mostrarlos.
const titleOf = (s: { title: string }) => decodeEntities(s.title)

// ── Detalle de una fuente ─────────────────────────────────────────
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <div className="text-sm text-foreground break-words">{children}</div>
    </div>
  )
}

// ── Clientes a los que aplica una publicación ─────────────────────
// Propone clientes por materia y giro; el socio elige y genera borradores que
// luego revisa y envía desde la matriz regulatoria.
function ObligationTargets({ sourceId }: { sourceId: string }) {
  const [targets, setTargets] = useState<ObligationTarget[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadError, setLoadError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<GenerateResult[] | null>(null)

  async function load() {
    try {
      const list = await getObligationTargets(sourceId)
      setTargets(list)
      setSelected(new Set(list.filter(t => t.applies && !t.itemId && !t.error).map(t => t.tenantId)))
    } catch {
      setLoadError('No se pudieron cargar los clientes')
    }
  }
  useEffect(() => { load() }, [sourceId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      const res = await generateObligations(sourceId, [...selected])
      if (!res.ok) { setError(res.error); return }
      setResults(res.results)
      await load()
    } catch {
      setError('No se pudieron generar las obligaciones')
    } finally {
      setGenerating(false)
    }
  }

  const reviewHref = (tenantId: string, itemId: string) => `/admin/obligaciones/${itemId}?tenant=${tenantId}`

  return (
    <div className="border-t border-border pt-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Clientes a los que aplica</p>
      <p className="text-xs text-muted-foreground mb-3">
        Propuesta según la materia y el giro de cada cliente. Se generan como borrador; el cliente no los ve hasta que los envías desde la matriz regulatoria.
      </p>
      {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {!targets && !loadError && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Revisando clientes…</p>}
      {targets && targets.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay clientes registrados.</p>}
      {targets && targets.length > 0 && (
        <ul className="space-y-2">
          {targets.map(t => (
            <li key={t.tenantId} className={cn('flex items-start gap-3 rounded-xl border px-3 py-2.5', t.applies ? 'border-[#1C2B4A]/25 bg-[#1C2B4A]/5' : 'border-border')}>
              {t.itemId ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
              ) : (
                <input type="checkbox" className="mt-1 shrink-0" aria-label={`Generar para ${t.name}`}
                  checked={selected.has(t.tenantId)} disabled={Boolean(t.error) || generating} onChange={() => toggle(t.tenantId)} />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.name}</p>
                <p className={cn('text-xs', t.error ? 'text-red-600' : 'text-muted-foreground')}>{t.error ?? t.reason}</p>
              </div>
              {t.itemId && (
                <a href={reviewHref(t.tenantId, t.itemId)} className="text-xs font-semibold text-[#1C2B4A] underline shrink-0">Revisar borrador</a>
              )}
            </li>
          ))}
        </ul>
      )}
      {results && results.some(r => r.error || !r.aiDraft) && (
        <ul className="mt-3 space-y-1 text-xs">
          {results.filter(r => r.error || !r.aiDraft).map(r => (
            <li key={r.tenantId} className={r.error ? 'text-red-600' : 'text-amber-700'}>
              {r.name}: {r.error ?? 'se creó con el resumen, sin redacción de IA; complétalo a mano'}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {targets && targets.some(t => !t.itemId && !t.error) && (
        <button onClick={handleGenerate} disabled={generating || selected.size === 0}
          className="mt-3 flex items-center gap-2 rounded-xl bg-[#1C2B4A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
          {generating ? 'Redactando borradores…' : `Generar obligaciones${selected.size ? ` (${selected.size})` : ''}`}
        </button>
      )}
    </div>
  )
}

function DetailModal({ source, parent, href, busy, onClose, onProcess }: {
  source: IngestSourceRow; parent?: IngestSourceRow; href?: string; busy: boolean
  onClose: () => void; onProcess: () => void
}) {
  useEscape(onClose)
  const none = <span className="text-muted-foreground">—</span>
  const isSite = source.kind === 'site'
  const canProcess = !isSite && (source.status === 'en_cola' || source.status === 'error')
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background w-full max-w-xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {isSite ? 'Sitio recurrente' : source.kind === 'url' ? 'Enlace' : 'Archivo'}
            </p>
            {/* <p> y no <h2>: las reglas globales de h1/h2 fuerzan fuentes enormes que ganan sobre Tailwind. */}
            <p role="heading" aria-level={2} className="mt-1 text-lg font-semibold leading-snug break-words [overflow-wrap:anywhere] line-clamp-4">{titleOf(source)}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full bg-secondary p-1.5 text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
          {!isSite && (
            <DetailRow label="Estado">
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide', statusBadge(source.status))}>
                {STATUS_LABELS[source.status] ?? source.status}
              </span>
              {source.status === 'error' && source.statusDetail && <p className="text-xs text-red-600 mt-1.5">{source.statusDetail}</p>}
              {source.processedAt && source.status === 'lista' && (
                <p className="text-xs text-muted-foreground mt-1.5">Procesada el {formatDate(source.processedAt)}</p>
              )}
            </DetailRow>
          )}

          {!isSite && source.status === 'lista' && (
            <>
              <div className="grid grid-cols-2 gap-5">
                <DetailRow label="Materia">{source.materia ? (MATERIAS[source.materia as keyof typeof MATERIAS] ?? source.materia) : none}</DetailRow>
                <DetailRow label="Autoridad emisora">{source.authority ?? none}</DetailRow>
                <DetailRow label="Fecha de publicación">{source.publishedAt ? formatDate(`${source.publishedAt}T12:00:00`) : none}</DetailRow>
                <DetailRow label="Vigencia">{source.vigenciaStatus ? (VIGENCIAS[source.vigenciaStatus as keyof typeof VIGENCIAS] ?? source.vigenciaStatus) : none}</DetailRow>
              </div>
              <DetailRow label="Detalle de vigencia">{source.vigenciaDetail ?? none}</DetailRow>
              <DetailRow label="Resumen">
                {source.summary ? <p className="leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{source.summary}</p> : none}
              </DetailRow>
              <ObligationTargets sourceId={source.id} />
            </>
          )}

          {!isSite && source.status !== 'lista' && source.status !== 'error' && (
            <p className="text-sm text-muted-foreground">Aún no se ha categorizado. Pulsa Procesar para que Otero la lea y la clasifique.</p>
          )}

          <div className="border-t border-border pt-5 space-y-5">
            <DetailRow label="Origen">
              {source.kind === 'file'
                ? [source.fileName, formatSize(source.sizeBytes), source.mimeType].filter(Boolean).join(' · ')
                : <a href={source.url ?? undefined} target="_blank" rel="noopener noreferrer" className="underline">{source.url}</a>}
            </DetailRow>
            {parent && <DetailRow label="Sitio recurrente">{titleOf(parent)}</DetailRow>}
            <DetailRow label="Agregada">{formatDate(source.createdAt)}{source.createdByName ? ` por ${source.createdByName}` : ''}</DetailRow>
          </div>
        </div>

        <div className="border-t border-border bg-background px-6 py-4 flex flex-wrap gap-3 shrink-0">
          {canProcess && (
            <button onClick={onProcess} disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-[#1C2B4A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : source.status === 'error' ? <RotateCw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {source.status === 'error' ? 'Reintentar' : 'Procesar'}
            </button>
          )}
          {source.status === 'procesando' && <span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</span>}
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium">
            <ExternalLink className="w-4 h-4" /> Abrir original
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────
function DeleteModal({ source, onCancel, onConfirm, pending }: {
  source: IngestSourceRow; onCancel: () => void; onConfirm: () => void; pending: boolean
}) {
  useEscape(onCancel)
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-center">Eliminar fuente</h3>
        <p className="text-sm text-muted-foreground text-center mt-2 break-words">
          <span className="font-medium text-foreground line-clamp-3">&ldquo;{titleOf(source)}&rdquo;</span> se quitará de la ingesta
          {source.kind === 'file' ? ' y el archivo se borrará.' : source.kind === 'site' ? '. Las publicaciones ya agregadas se conservan.' : '.'}
        </p>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 text-sm font-medium bg-secondary py-2.5 rounded-xl">Cancelar</button>
          <button onClick={onConfirm} disabled={pending} className="flex-1 text-sm font-semibold text-white bg-red-600 py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────
type KindFilter = 'todas' | 'url' | 'file' | 'site'

export default function IngestaManager({ initialSources }: { initialSources: IngestSourceRow[] }) {
  const [sources, setSources] = useState(initialSources)
  const [mode, setMode] = useState<'url' | 'file' | 'site'>('url')
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<KindFilter>('todas')
  const [status, setStatus] = useState('todos')
  const [deleting, setDeleting] = useState<IngestSourceRow | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processError, setProcessError] = useState('')
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [checkMessage, setCheckMessage] = useState('')
  const [checkDate, setCheckDate] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)
  const stopBatch = useRef(false)

  const addSource = (s: IngestSourceRow) => setSources(prev => [s, ...prev])

  const items = sources.filter(s => s.kind !== 'site')
  // Los sitios recurrentes no tienen estado de procesamiento propio: solo salen con el filtro de estado en "todos".
  const filtered = sources.filter(s => {
    if (kind !== 'todas' && s.kind !== kind) return false
    if (status !== 'todos' && (s.kind === 'site' || s.status !== status)) return false
    const q = search.trim().toLowerCase()
    return !q || titleOf(s).toLowerCase().includes(q) || (s.url ?? '').toLowerCase().includes(q) || (s.fileName ?? '').toLowerCase().includes(q)
  })

  const sites = sources.filter(s => s.kind === 'site')
  const siteById = new Map(sites.map(x => [x.id, x]))
  const childCount = (siteId: string) => items.filter(x => x.parentId === siteId).length
  const failed = items.filter(s => s.status === 'error')
  const counts = {
    total: items.length,
    queued: items.filter(s => s.status === 'en_cola' || s.status === 'procesando').length,
    ready: items.filter(s => s.status === 'lista').length,
    error: failed.length,
  }

  async function handleProcess(s: IngestSourceRow) {
    setProcessingId(s.id)
    setProcessError('')
    setSources(prev => prev.map(x => x.id === s.id ? { ...x, status: 'procesando', statusDetail: null } : x))
    try {
      const res = await processSource(s.id)
      if (res.ok) setSources(prev => prev.map(x => x.id === s.id ? res.source : x))
      else {
        setProcessError(res.error)
        setSources(prev => prev.map(x => x.id === s.id ? s : x))
      }
    } catch {
      // Normalmente es el límite de duración de la función: el estado real queda en la base.
      setProcessError('El procesamiento tardó demasiado o falló. Recarga la página para ver el estado.')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleCheck(site: IngestSourceRow) {
    setCheckingId(site.id)
    setCheckMessage('')
    setProcessError('')
    try {
      const res = await checkSite(site.id, checkDate || undefined)
      if (!res.ok) { setProcessError(res.error); return }
      setSources(prev => [...res.created.reverse(), ...prev.map(x => x.id === site.id ? res.site : x)])
      const parts = [`${res.created.length} publicaciones nuevas`]
      if (res.skipped) parts.push(`${res.skipped} ya estaban registradas`)
      if (res.remaining) parts.push(`quedan ${res.remaining} sin agregar; vuelve a pulsar Revisar ahora`)
      setCheckMessage(`${parts.join(', ')}.`)
    } catch {
      setProcessError('No se pudo revisar el sitio. Intenta de nuevo.')
    } finally {
      setCheckingId(null)
    }
  }

  // Una a la vez y con pausa: cada fuente puede tardar hasta 60 s y evitamos saturar el sitio de origen.
  async function handleProcessQueued() {
    stopBatch.current = false
    setBatchRunning(true)
    setProcessError('')
    const queue = items.filter(s => s.status === 'en_cola')
    try {
      for (const s of queue) {
        if (stopBatch.current) break
        await handleProcess(s)
        await new Promise(r => setTimeout(r, 1200))
      }
    } finally {
      setBatchRunning(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteIngestSource(deleting.id)
      setSources(prev => prev.filter(s => s.id !== deleting.id))
      setDeleting(null)
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <div className="min-h-full p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl! leading-tight! font-semibold text-foreground">Ingesta de información</h1>
        <p className="mt-1 text-sm text-muted-foreground">Agrega enlaces y documentos y pulsa Procesar: Otero los lee y los clasifica por materia, autoridad, fecha y vigencia.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Fuentes" value={counts.total} />
        <StatCard label="En cola" value={counts.queued} accent="amber" />
        <StatCard label="Listas" value={counts.ready} accent="green" />
        <StatCard label="Con error" value={counts.error} accent="red" />
      </div>

      {/* Alta */}
      <section className="mb-6 bg-card border border-border rounded-2xl p-5">
        <div className="mb-4 inline-flex rounded-xl bg-secondary p-1">
          {([['url', 'Enlace', Link2], ['file', 'Archivo', FileText], ['site', 'Sitio recurrente', Globe]] as const).map(([value, label, Icon]) => (
            <button key={value} onClick={() => setMode(value)}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                mode === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
        {mode === 'url' ? <UrlForm onAdded={addSource} /> : mode === 'file' ? <FileDrop onAdded={addSource} /> : <SiteForm hasSite={sites.length > 0} onAdded={addSource} />}
      </section>

      {/* Alerta: fuentes que no se pudieron leer */}
      {failed.length > 0 && (
        <section role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {failed.length === 1 ? '1 fuente no se pudo leer' : `${failed.length} fuentes no se pudieron leer`}: revísalas a mano
              </p>
              <p className="text-xs text-amber-800 mt-0.5">Ábrelas, descarga el PDF o copia el texto y súbelo en la pestaña Archivo; luego elimina la fuente fallida. También puedes reintentar.</p>
              <ul className="mt-3 space-y-1.5">
                {failed.slice(0, 8).map(f => (
                  <li key={f.id} className="flex items-center gap-2 text-xs text-amber-900">
                    <span className="truncate font-medium">{titleOf(f)}</span>
                    <span className="shrink-0 text-amber-800">· {f.statusDetail ?? 'Error'}</span>
                    <a href={f.kind === 'url' ? f.url ?? undefined : `/api/ingesta/file?id=${encodeURIComponent(f.id)}`} target="_blank" rel="noopener noreferrer"
                      className="ml-auto shrink-0 underline">Abrir</a>
                  </li>
                ))}
                {failed.length > 8 && <li className="text-xs text-amber-800">y {failed.length - 8} más en la lista</li>}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título, URL o archivo…"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none" />
        </div>
        <select value={kind} onChange={e => setKind(e.target.value as KindFilter)}
          className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none">
          <option value="todas">Todos los tipos</option>
          <option value="url">Enlaces</option>
          <option value="file">Archivos</option>
          <option value="site">Sitios recurrentes</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none">
          <option value="todos">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {counts.queued > 0 && (
        <div className="mb-3 flex items-center gap-3">
          {!batchRunning
            ? <button onClick={handleProcessQueued} disabled={processingId !== null}
                className="flex items-center gap-2 rounded-xl bg-[#1C2B4A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                <Play className="w-3.5 h-3.5" /> Procesar pendientes
              </button>
            : <button onClick={() => { stopBatch.current = true }}
                className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Detener después de esta
              </button>}
          <span className="text-[11px] text-muted-foreground">Procesa de una en una; no cierres la página mientras corre.</span>
        </div>
      )}
      {processError && <p className="mb-3 text-xs text-red-600">{processError}</p>}
      {checkMessage && <p className="mb-3 text-xs text-emerald-700">{checkMessage}</p>}

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {sources.length === 0 ? 'Aún no hay fuentes. Agrega un enlace o sube un documento.' : 'Ninguna fuente coincide con los filtros.'}
            </p>
          </div>
        )}
        {filtered.map(s => {
          const href = s.kind === 'url' || s.kind === 'site' ? s.url ?? undefined : `/api/ingesta/file?id=${encodeURIComponent(s.id)}`
          return (
            <article key={s.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                {s.kind === 'site' ? <Globe className="w-4 h-4" /> : s.kind === 'url' ? <Link2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <button onClick={() => setDetailId(s.id)} className="block max-w-full text-left text-sm font-medium text-foreground truncate hover:underline" title={titleOf(s)}>{titleOf(s)}</button>
                <p className="text-xs text-muted-foreground truncate">
                  {s.kind === 'file' ? [s.fileName, formatSize(s.sizeBytes)].filter(Boolean).join(' · ') : s.url}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDate(s.createdAt)}{s.createdByName ? ` · ${s.createdByName}` : ''}
                  {s.kind === 'site' && ` · ${childCount(s.id)} publicaciones · ${s.lastCheckedAt ? `revisado ${new Date(s.lastCheckedAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}` : 'sin revisar'}`}
                  {s.parentId && siteById.get(s.parentId) && ` · de ${titleOf(siteById.get(s.parentId)!)}`}
                </p>
                {s.kind !== 'site' && s.status === 'error' && s.statusDetail && <p className="text-[11px] text-red-600 mt-0.5">{s.statusDetail}</p>}
                {s.kind !== 'site' && s.status === 'lista' && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      {s.materia && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1C2B4A]/10 text-[#1C2B4A]">{MATERIAS[s.materia as keyof typeof MATERIAS] ?? s.materia}</span>}
                      {s.authority && <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{s.authority}</span>}
                      {s.publishedAt && <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">Publicada {formatDate(`${s.publishedAt}T12:00:00`)}</span>}
                      {s.vigenciaStatus && <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5" title={s.vigenciaDetail ?? undefined}>{VIGENCIAS[s.vigenciaStatus as keyof typeof VIGENCIAS] ?? s.vigenciaStatus}</span>}
                    </div>
                    {s.summary && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{s.summary}</p>}
                  </div>
                )}
              </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-[3.25rem] sm:pl-0 sm:shrink-0">
              {s.kind === 'site'
                ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide shrink-0 bg-indigo-50 text-indigo-700 border-indigo-200">Sitio recurrente</span>
                : <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide shrink-0', statusBadge(s.status))}>
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>}
              <div className="flex flex-wrap items-center gap-1">
                {s.kind === 'site' && (
                  <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)}
                    aria-label="Fecha del sumario (vacío = hoy)" title="Fecha del sumario (vacío = hoy, hora de la Ciudad de México)"
                    className="w-36 bg-background border border-border rounded-lg px-2 py-1 text-xs" />
                )}
                {s.kind === 'site' && (
                  <button onClick={() => handleCheck(s)} disabled={checkingId !== null}
                    className="flex items-center gap-1.5 rounded-lg bg-[#1C2B4A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                    {checkingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarSearch className="w-3.5 h-3.5" />}
                    Revisar ahora
                  </button>
                )}
                {s.kind !== 'site' && (s.status === 'en_cola' || s.status === 'error') && (
                  <button onClick={() => handleProcess(s)} disabled={processingId !== null}
                    className="flex items-center gap-1.5 rounded-lg bg-[#1C2B4A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                    {s.status === 'error' ? <RotateCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {s.status === 'error' ? 'Reintentar' : 'Procesar'}
                  </button>
                )}
                {s.kind !== 'site' && s.status === 'procesando' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-2" />}
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Abrir"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => setDeleting(s)} aria-label="Eliminar"
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              </div>
            </article>
          )
        })}
      </div>

      {detailId && (() => {
        const d = sources.find(x => x.id === detailId)
        if (!d) return null
        return (
          <DetailModal source={d} parent={d.parentId ? siteById.get(d.parentId) : undefined}
            href={d.kind === 'file' ? `/api/ingesta/file?id=${encodeURIComponent(d.id)}` : d.url ?? undefined}
            busy={processingId !== null} onClose={() => setDetailId(null)} onProcess={() => handleProcess(d)} />
        )
      })()}

      {deleting && (
        <DeleteModal source={deleting} pending={deletePending} onCancel={() => setDeleting(null)} onConfirm={handleDelete} />
      )}
    </div>
  )
}
