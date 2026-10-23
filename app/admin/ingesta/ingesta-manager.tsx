'use client'

import { useRef, useState } from 'react'
import { AlertCircle, CalendarSearch, ExternalLink, FileText, Globe, Link2, Loader2, Play, RotateCw, Search, Trash2, Upload, X } from 'lucide-react'
import { addSiteSource, addUrlSource, checkSite, deleteIngestSource, processSource, type IngestSourceRow } from '@/app/actions/ingest'
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from '@/lib/upload-rules'
import { MATERIAS, VIGENCIAS } from '@/lib/ingest/categories'
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

// ── Delete confirm ────────────────────────────────────────────────
function DeleteModal({ source, onCancel, onConfirm, pending }: {
  source: IngestSourceRow; onCancel: () => void; onConfirm: () => void; pending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-center">Eliminar fuente</h3>
        <p className="text-sm text-muted-foreground text-center mt-2 break-words">
          <span className="font-medium text-foreground">&ldquo;{source.title}&rdquo;</span> se quitará de la ingesta
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
type KindFilter = 'todas' | 'url' | 'file'

export default function IngestaManager({ initialSources }: { initialSources: IngestSourceRow[] }) {
  const [sources, setSources] = useState(initialSources)
  const [mode, setMode] = useState<'url' | 'file' | 'site'>('url')
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<KindFilter>('todas')
  const [status, setStatus] = useState('todos')
  const [deleting, setDeleting] = useState<IngestSourceRow | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [processError, setProcessError] = useState('')
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [checkMessage, setCheckMessage] = useState('')
  const [checkDate, setCheckDate] = useState('')
  const [batchRunning, setBatchRunning] = useState(false)
  const stopBatch = useRef(false)

  const addSource = (s: IngestSourceRow) => setSources(prev => [s, ...prev])

  const items = sources.filter(s => s.kind !== 'site')
  const filtered = items.filter(s => {
    if (kind !== 'todas' && s.kind !== kind) return false
    if (status !== 'todos' && s.status !== status) return false
    const q = search.trim().toLowerCase()
    return !q || s.title.toLowerCase().includes(q) || (s.url ?? '').toLowerCase().includes(q) || (s.fileName ?? '').toLowerCase().includes(q)
  })

  const sites = sources.filter(s => s.kind === 'site')
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
        <h1 className="font-serif text-3xl font-semibold text-foreground">Ingesta de información</h1>
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

      {/* Sitios recurrentes */}
      {sites.map(site => (
        <section key={site.id} className="mb-6 bg-card border border-border rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground"><Globe className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{site.title}</p>
              <p className="text-xs text-muted-foreground">
                {site.lastCheckedAt ? `Última revisión: ${new Date(site.lastCheckedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Aún no se ha revisado'}
              </p>
            </div>
            <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} aria-label="Fecha del sumario"
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm" />
            <button onClick={() => handleCheck(site)} disabled={checkingId !== null}
              className="flex items-center gap-2 rounded-xl bg-[#1C2B4A] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {checkingId === site.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarSearch className="w-4 h-4" />}
              Revisar ahora
            </button>
            <button onClick={() => setDeleting(site)} aria-label="Quitar sitio" className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Sin fecha se revisa el sumario de hoy (hora de la Ciudad de México).</p>
          {checkMessage && <p className="mt-2 text-xs text-emerald-700">{checkMessage}</p>}
        </section>
      ))}

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
                    <span className="truncate font-medium">{f.title}</span>
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
          const href = s.kind === 'url' ? s.url ?? undefined : `/api/ingesta/file?id=${encodeURIComponent(s.id)}`
          return (
            <article key={s.id} className="flex items-start gap-4 bg-card border border-border rounded-2xl px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-muted-foreground">
                {s.kind === 'url' ? <Link2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.kind === 'url' ? s.url : [s.fileName, formatSize(s.sizeBytes)].filter(Boolean).join(' · ')}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDate(s.createdAt)}{s.createdByName ? ` · ${s.createdByName}` : ''}
                </p>
                {s.status === 'error' && s.statusDetail && <p className="text-[11px] text-red-600 mt-0.5">{s.statusDetail}</p>}
                {s.status === 'lista' && (
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
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide shrink-0', statusBadge(s.status))}>
                {STATUS_LABELS[s.status] ?? s.status}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {(s.status === 'en_cola' || s.status === 'error') && (
                  <button onClick={() => handleProcess(s)} disabled={processingId !== null}
                    className="flex items-center gap-1.5 rounded-lg bg-[#1C2B4A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                    {s.status === 'error' ? <RotateCw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {s.status === 'error' ? 'Reintentar' : 'Procesar'}
                  </button>
                )}
                {s.status === 'procesando' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-2" />}
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Abrir"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button onClick={() => setDeleting(s)} aria-label="Eliminar"
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {deleting && (
        <DeleteModal source={deleting} pending={deletePending} onCancel={() => setDeleting(null)} onConfirm={handleDelete} />
      )}
    </div>
  )
}
