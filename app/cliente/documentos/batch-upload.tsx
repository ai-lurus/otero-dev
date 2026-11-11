"use client"

import { useRef, useState } from "react"
import { upload } from "@vercel/blob/client"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StatusTag } from "@/components/ui/status-tag"
import type { DocumentRow } from "@/lib/db/schema"
import { documentBlobPath } from "@/lib/documents/blob-path"
import { MAX_BATCH_FILES, UPLOAD_CONCURRENCY, pickBatchFiles, runPool } from "@/lib/documents/batch"
import { AnalysisDialog } from "./analysis-dialog"
import { BatchReview } from "./batch-review"

const FIELD = "w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
const LABEL = "mb-1 block text-label text-ink-muted"
const DEFAULT_CATEGORIES = ["General", "Corporativo", "Ambiental", "Fiscal", "Contratos", "Permisos", "Trámites"]
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp,.heic"

type Item = {
  key: string
  file: File
  status: "queued" | "uploading" | "reading" | "done" | "error"
  error?: string
  docId?: string
}

const extOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toLowerCase() : "file")
const sizeOf = (bytes: number) => (bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`)

export function BatchUploadModal({
  tenantId,
  defaultCategory,
  existingCategories,
  canManage,
  onClose,
  onUpsert,
}: {
  tenantId: string
  defaultCategory?: string
  existingCategories: string[]
  /** Solo el director confirma los datos detectados. */
  canManage: boolean
  onClose: () => void
  /** Agrega o reemplaza un documento en la lista de la página. */
  onUpsert: (doc: DocumentRow) => void
}) {
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...existingCategories])]
  const [items, setItems] = useState<Item[]>([])
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([])
  const [category, setCategory] = useState(defaultCategory ?? allCategories[0])
  const [newFolder, setNewFolder] = useState("")
  const [service, setService] = useState("")
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [details, setDetails] = useState<DocumentRow | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closed = useRef(false)

  const finalCategory = newFolder.trim() || category

  function addFiles(list: FileList | File[]) {
    const { accepted, rejected: bad } = pickBatchFiles(Array.from(list), items.length)
    setRejected(bad)
    setItems(prev => [...prev, ...accepted.map(file => ({ key: crypto.randomUUID(), file, status: "queued" as const }))])
  }

  const patchItem = (key: string, change: Partial<Item>) =>
    setItems(prev => prev.map(i => (i.key === key ? { ...i, ...change } : i)))

  function upsert(doc: DocumentRow) {
    setDocs(prev => (prev.some(d => d.id === doc.id) ? prev.map(d => (d.id === doc.id ? doc : d)) : [...prev, doc]))
    onUpsert(doc)
  }

  async function uploadOne(item: Item) {
    if (closed.current) return
    patchItem(item.key, { status: "uploading" })
    try {
      // 1) El archivo va directo a Blob (sin límite de cuerpo de función); 2) el servidor lo registra y lo lee.
      const blob = await upload(documentBlobPath(tenantId, item.file.name, item.key), item.file, {
        access: "private",
        handleUploadUrl: "/api/upload/token",
        contentType: item.file.type,
        multipart: item.file.size > 8 * 1024 * 1024,
      })
      patchItem(item.key, { status: "reading" })
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pathname: blob.pathname, name: item.file.name, category: finalCategory, service: service.trim() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? "No se pudo subir")
      }
      const data = await res.json()
      patchItem(item.key, { status: "done", docId: data.docId })
      const now = new Date()
      upsert({
        id: data.docId, tenantId, name: item.file.name, type: extOf(item.file.name), category: finalCategory,
        service: service.trim() || null, status: "vigente", size: data.size ?? sizeOf(item.file.size), uploadedAt: now,
        expiresAt: null, requiresSignature: false, signed: false, blobUrl: null, blobPathname: data.pathname,
        analysis: data.analysis ?? null, analysisStatus: data.analysis ? "detected" : "none",
        analysisConfirmedAt: null, createdAt: now,
      })
    } catch (e) {
      patchItem(item.key, { status: "error", error: e instanceof Error ? e.message : "No se pudo subir" })
    }
  }

  async function start(only?: Item[]) {
    const queue = only ?? items.filter(i => i.status === "queued")
    if (queue.length === 0) return
    setRunning(true)
    setStarted(true)
    await runPool(queue, UPLOAD_CONCURRENCY, uploadOne)
    setRunning(false)
  }

  const done = items.filter(i => i.status === "done").length
  const failed = items.filter(i => i.status === "error")
  const queued = items.filter(i => i.status === "queued")

  function close() {
    closed.current = true
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-title"
        className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-surface-raised p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="batch-title" className="text-heading text-ink">Subir documentos</h2>
            <p className="mt-1 text-body-sm text-ink-muted">Hasta {MAX_BATCH_FILES} archivos a la vez. Otero lee cada uno y te pide confirmar lo que detecte.</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Cerrar"><XIcon /></Button>
        </div>

        {!started && (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
              className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragging ? "border-ink bg-surface-sunken" : "border-border-strong"}`}
            >
              <p className="text-body-sm font-semibold text-ink">Arrastra tus archivos aquí</p>
              <p className="mt-1 text-caption text-ink-muted">PDF, Word, Excel, imágenes o texto, hasta 50 MB cada uno</p>
              <Button variant="outline" className="mt-3" onClick={() => inputRef.current?.click()}>Seleccionar archivos</Button>
              <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
                onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = "" }} />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="batch-folder">Carpeta destino</label>
                <select id="batch-folder" className={FIELD} value={category} onChange={e => setCategory(e.target.value)}>
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input aria-label="Nueva carpeta" className={`${FIELD} mt-2`} placeholder="O escribe una carpeta nueva" value={newFolder} onChange={e => setNewFolder(e.target.value)} />
              </div>
              <div>
                <label className={LABEL} htmlFor="batch-service">Planta o servicio (opcional)</label>
                <input id="batch-service" className={FIELD} maxLength={120} placeholder="Se asigna a todo el lote" value={service} onChange={e => setService(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {rejected.length > 0 && (
          <ul role="alert" className="mt-4 rounded-md bg-warn-tint px-3 py-2 text-caption text-warn-text">
            {rejected.map((r, i) => <li key={i}>{r.name}: {r.reason}</li>)}
          </ul>
        )}

        {items.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1">
            {items.map(item => (
              <li key={item.key} className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-body-sm text-ink">{item.file.name}</p>
                  <p className="text-caption text-ink-muted">{item.status === "error" ? item.error : sizeOf(item.file.size)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.status === "queued" && !started && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${item.file.name}`} onClick={() => setItems(prev => prev.filter(i => i.key !== item.key))}><XIcon /></Button>
                  )}
                  {item.status === "queued" && started && <span className="text-caption text-ink-muted">En cola</span>}
                  {item.status === "uploading" && <span className="flex items-center gap-1 text-caption text-ink-muted"><Spinner /> Subiendo</span>}
                  {item.status === "reading" && <span className="flex items-center gap-1 text-caption text-ink-muted"><Spinner /> Leyendo</span>}
                  {item.status === "done" && <StatusTag status="ok" label="Subido" />}
                  {item.status === "error" && (
                    <>
                      <StatusTag status="risk" label="Falló" />
                      <Button size="sm" variant="link" onClick={() => start([item])} disabled={running}>Reintentar</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {started && (
          <p className="mt-3 text-body-sm text-ink-muted" aria-live="polite">
            {done} de {items.length} subidos{failed.length > 0 ? `, ${failed.length} con error` : ""}.
            {running ? " Puedes seguir aquí mientras Otero lee los documentos." : ""}
          </p>
        )}

        {started && !running && failed.length > 0 && (
          <Button className="mt-3" variant="outline" onClick={() => start(failed)}>Reintentar los {failed.length} que fallaron</Button>
        )}

        {docs.length > 0 && (
          canManage ? (
            <BatchReview
              docs={docs}
              onDetails={setDetails}
              onConfirmed={rows => rows.forEach(upsert)}
            />
          ) : (
            <p className="mt-6 text-body-sm text-ink-muted">Los documentos quedan por confirmar. El director de tu empresa revisa lo que Otero detectó.</p>
          )
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant={started && !running ? "outline" : "ghost"} onClick={close}>{started && !running ? "Listo" : "Cerrar"}</Button>
          {!started && (
            <Button onClick={() => start()} disabled={queued.length === 0}>
              Subir {queued.length > 0 ? `${queued.length} archivo${queued.length === 1 ? "" : "s"}` : ""}
            </Button>
          )}
        </div>
      </div>
      {details && (
        <AnalysisDialog key={details.id} doc={details} onClose={() => setDetails(null)} onSaved={row => { upsert(row); setDetails(null) }} />
      )}
    </div>
  )
}
