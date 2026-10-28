"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import type { DocumentRow } from "@/lib/db/schema"
import { deleteDocument } from "@/app/actions/documents"

// ── File type config ──────────────────────────────────────────────
const EXT_CONFIG: Record<string, { color: string; label: string }> = {
  pdf:  { color: "var(--risk)", label: "PDF" },
  doc:  { color: "var(--ink)", label: "DOC" },
  docx: { color: "var(--ink)", label: "DOC" },
  xls:  { color: "var(--ok)", label: "XLS" },
  xlsx: { color: "var(--ok)", label: "XLS" },
  dwg:  { color: "var(--warn-text)", label: "DWG" },
  jpg:  { color: "var(--brand-text)", label: "IMG" },
  jpeg: { color: "var(--brand-text)", label: "IMG" },
  png:  { color: "var(--brand-text)", label: "IMG" },
}

function getExt(name: string) {
  const parts = name.split(".")
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "file"
}

function FileIcon({ name }: { name: string }) {
  const ext = getExt(name)
  const cfg = EXT_CONFIG[ext] ?? { color: "var(--ink-muted)", label: ext.toUpperCase().slice(0, 3) }
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-[10px]"
      style={{ background: cfg.color + "18", color: cfg.color }}
    >
      {cfg.label}
    </div>
  )
}

const FOLDER_COLORS: string[] = [
  "var(--ink)", "var(--ok)", "var(--warn-text)", "var(--risk)", "var(--brand-text)", "var(--ink-muted)",
]

function FolderIcon({ category, index }: { category: string; index: number }) {
  const color = FOLDER_COLORS[index % FOLDER_COLORS.length]
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "18" }}>
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    </div>
  )
}

// ── Upload Modal ──────────────────────────────────────────────────
const DEFAULT_CATEGORIES = ["General", "Corporativo", "Ambiental", "Fiscal", "Contratos", "Permisos", "Trámites"]

function UploadModal({
  tenantId,
  defaultCategory,
  existingCategories,
  onClose,
  onSuccess,
}: {
  tenantId: string
  defaultCategory?: string
  existingCategories: string[]
  onClose: () => void
  onSuccess: (doc: DocumentRow) => void
}) {
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...existingCategories])]
  const [file, setFile]           = useState<File | null>(null)
  const [category, setCategory]   = useState(defaultCategory ?? allCategories[0])
  const [newFolder, setNewFolder] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const finalCategory = newFolder.trim() || category

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("tenantId", tenantId)
      fd.append("category", finalCategory)
      fd.append("requiresSignature", "false")
      if (expiresAt) fd.append("expiresAt", expiresAt)

      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "Error al subir")
      }
      const data = await res.json()
      const size = file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(0)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`

      onSuccess({
        id:                data.docId,
        tenantId,
        name:              file.name,
        type:              getExt(file.name),
        category:          finalCategory,
        service:           null,
        status:            "vigente",
        size,
        uploadedAt:        new Date(),
        expiresAt:         null,
        requiresSignature: false,
        signed:            false,
        blobUrl:           null,
        blobPathname:      data.pathname,
        createdAt:         new Date(),
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al subir")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-background rounded-2xl p-6 ">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-foreground">Subir archivo</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <button
          onClick={() => inputRef.current?.click()}
          className={cn(
            "w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 transition-colors mb-4 text-center",
            file ? "border-ok bg-ok/5" : "border-border hover:border-foreground/30"
          )}
        >
          {file ? (
            <>
              <FileIcon name={file.name} />
              <p className="text-sm font-medium text-foreground line-clamp-2">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">{
                file.size < 1024 * 1024
                  ? `${(file.size / 1024).toFixed(0)} KB`
                  : `${(file.size / (1024 * 1024)).toFixed(1)} MB`
              }</p>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-sm font-medium text-foreground">Seleccionar archivo</p>
              <p className="text-[11px] text-muted-foreground">PDF, DOC, XLS, DWG, JPG — hasta 50 MB</p>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.jpg,.jpeg,.png"
          onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }}
        />

        {/* Folder */}
        <div className="mb-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Carpeta destino</label>
          <select
            value={newFolder ? "__new__" : category}
            onChange={e => { if (e.target.value !== "__new__") { setCategory(e.target.value); setNewFolder("") } }}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-2"
          >
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__new__">+ Nueva carpeta...</option>
          </select>
          <input
            placeholder="Nombre de la nueva carpeta"
            value={newFolder}
            onChange={e => setNewFolder(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {newFolder && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Se creará la carpeta <span className="font-semibold text-foreground">{newFolder}</span>
            </p>
          )}
        </div>

        {/* Expiry date — optional, triggers auto-obligation */}
        <div className="mb-3">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Fecha de vencimiento
            <span className="ml-1.5 normal-case font-normal text-muted-foreground/60">(opcional — genera alerta en asuntos regulatorios)</span>
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && <p className="text-xs text-risk mb-3">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-foreground text-background font-semibold text-sm py-3 rounded-xl disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 mt-2"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              Subiendo...
            </>
          ) : "Subir archivo"}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────
interface DocumentosPageProps {
  initialDocs: DocumentRow[]
  tenantId: string
}

export default function DocumentosPage({ initialDocs, tenantId }: DocumentosPageProps) {
  const [docs, setDocs]               = useState<DocumentRow[]>(initialDocs)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [search, setSearch]           = useState("")
  const [showUpload, setShowUpload]   = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  // Group by category (folder)
  const folders = [...new Set(docs.map(d => d.category))].sort()
  const folderCounts = Object.fromEntries(folders.map(f => [f, docs.filter(d => d.category === f).length]))

  const folderDocs = selectedFolder
    ? docs.filter(d => d.category === selectedFolder && (!search || d.name.toLowerCase().includes(search.toLowerCase())))
    : []

  function handleUploadSuccess(doc: DocumentRow) {
    setDocs(prev => [doc, ...prev])
    // Auto-navigate into the folder the file was uploaded to
    setSelectedFolder(doc.category)
    setShowUpload(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteDocument(id)
      setDocs(prev => prev.filter(d => d.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  // ── Breadcrumb ────────────────────────────────────────────────
  function Breadcrumb() {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        <button onClick={() => { setSelectedFolder(null); setSearch("") }} className="hover:text-foreground transition-colors">
          Documentos
        </button>
        {selectedFolder && (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-foreground font-semibold">{selectedFolder}</span>
          </>
        )}
      </div>
    )
  }

  // ── FOLDER GRID VIEW ─────────────────────────────────────────
  if (!selectedFolder) {
    return (
      <>
        {showUpload && (
          <UploadModal
            tenantId={tenantId}
            existingCategories={folders}
            onClose={() => setShowUpload(false)}
            onSuccess={handleUploadSuccess}
          />
        )}
        <div className="min-h-full p-6 lg:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-semibold text-foreground">Documentos</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {docs.length} archivo{docs.length !== 1 ? "s" : ""} en {folders.length} carpeta{folders.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Subir archivo
            </button>
          </div>

          {folders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-20 text-center">
              <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <p className="text-sm font-medium text-muted-foreground">Sin carpetas todavía</p>
              <p className="mt-1 text-xs text-muted-foreground">Sube tu primer archivo para crear una carpeta</p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 text-sm font-semibold text-foreground underline underline-offset-2"
              >
                Subir primer archivo
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((folder, i) => (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-foreground/20  active:scale-[0.98]"
                >
                  <div className="flex items-start gap-3">
                    <FolderIcon category={folder} index={i} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground leading-snug">{folder}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {folderCounts[folder]} archivo{folderCounts[folder] !== 1 ? "s" : ""}
                      </p>
                      {/* file type dots */}
                      <div className="flex items-center gap-0.5 mt-2">
                        {[...new Set(docs.filter(d => d.category === folder).map(d => getExt(d.name)).filter(e => EXT_CONFIG[e]))].slice(0, 5).map(ext => (
                          <span key={ext} className="w-2 h-2 rounded-full" style={{ background: EXT_CONFIG[ext]?.color }} />
                        ))}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  // ── FILE LIST VIEW ────────────────────────────────────────────
  return (
    <>
      {showUpload && (
        <UploadModal
          tenantId={tenantId}
          defaultCategory={selectedFolder}
          existingCategories={folders}
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
      <div className="min-h-full p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <Breadcrumb />
          <div className="flex items-start justify-between gap-4 mt-2">
            <h1 className="font-serif text-3xl font-semibold text-foreground">{selectedFolder}</h1>
            <button
              onClick={() => setShowUpload(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Subir archivo
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar archivo..."
            className="w-full max-w-sm rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* File list */}
        {folderDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "Sin resultados para esa búsqueda" : "Esta carpeta está vacía"}
            </p>
            {!search && (
              <button onClick={() => setShowUpload(true)} className="mt-3 text-sm font-semibold text-foreground underline underline-offset-2">
                Subir primer archivo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {folderDocs.map(doc => {
              const downloadHref = doc.blobPathname
                ? `/api/file?pathname=${encodeURIComponent(doc.blobPathname)}`
                : undefined
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-foreground/20  transition-all"
                >
                  <FileIcon name={doc.name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground leading-snug">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {doc.size && <span className="text-[10px] text-muted-foreground">{doc.size}</span>}
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(doc.uploadedAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {downloadHref && (
                      <a
                        href={downloadHref}
                        download
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title="Descargar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-risk-tint hover:text-risk transition-colors disabled:opacity-40"
                      title="Eliminar"
                    >
                      {deletingId === doc.id ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
