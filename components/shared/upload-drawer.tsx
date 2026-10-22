"use client"

import { useCallback, useRef, useState } from "react"
import { Drawer } from "vaul"
import { toast } from "sonner"
import { X, Upload, FileText, FileImage, File, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  addDoc,
  renewDoc,
  findDuplicate,
  fileTypeFromName,
  formatFileSize,
  SEDES,
  RESPONSABLES,
  CATEGORY_LABELS,
  type ObligationDoc,
  type DocCategory,
} from "@/lib/compliance-store"

// ─── Types ───────────────────────────────────────────────────────────────────

interface StagedFile {
  id: string
  file: File
  name: string           // editable document name
  category: DocCategory
  sede: string
  responsable: string
  expiresAt: string
  noExpiry: boolean
  error: string | null
  duplicate: ObligationDoc | null
  isRenewal: boolean     // user confirmed this is a renewal of the duplicate
}

interface UploadDrawerProps {
  open: boolean
  onClose: () => void
  /** Pre-fill sede for a specific location context */
  defaultSede?: string
}

const ACCEPTED = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
const MAX_SIZE_MB = 50

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (ext === "pdf") return <FileText className="h-4 w-4 text-red-500" />
  if (["doc", "docx"].includes(ext)) return <FileText className="h-4 w-4 text-blue-500" />
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return <FileImage className="h-4 w-4 text-violet-500" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

function makeStaged(file: File): StagedFile {
  return {
    id: `staged-${Date.now()}-${Math.random()}`,
    file,
    name: file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
    category: "permiso",
    sede: SEDES[0],
    responsable: RESPONSABLES[0],
    expiresAt: "",
    noExpiry: false,
    error: null,
    duplicate: null,
    isRenewal: false,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UploadDrawer({ open, onClose, defaultSede }: UploadDrawerProps) {
  const [staged, setStaged] = useState<StagedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function patchStaged(id: string, patch: Partial<StagedFile>) {
    setStaged((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  function validateFile(file: File): string | null {
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) return `El archivo supera el límite de ${MAX_SIZE_MB} MB.`
    const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
    const valid = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"]
    if (!valid.includes(ext)) return `Tipo de archivo no permitido (.${ext}).`
    return null
  }

  function stageFiles(files: File[]) {
    const newStaged = files.map((file) => {
      const base = makeStaged(file)
      if (defaultSede) base.sede = defaultSede
      const error = validateFile(file)
      if (error) return { ...base, error }
      const dup = findDuplicate(base.name, base.sede)
      return { ...base, duplicate: dup }
    })
    setStaged((prev) => [...prev, ...newStaged])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    stageFiles(Array.from(e.dataTransfer.files))
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) stageFiles(Array.from(e.target.files))
    e.target.value = ""
  }

  function removeStaged(id: string) {
    setStaged((prev) => prev.filter((s) => s.id !== id))
  }

  // Recheck duplicates when name or sede changes
  function handleNameChange(id: string, name: string) {
    setStaged((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const dup = findDuplicate(name, s.sede)
        return { ...s, name, duplicate: dup, isRenewal: dup ? s.isRenewal : false }
      }),
    )
  }

  function handleSedeChange(id: string, sede: string) {
    setStaged((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        const dup = findDuplicate(s.name, sede)
        return { ...s, sede, duplicate: dup, isRenewal: dup ? s.isRenewal : false }
      }),
    )
  }

  const handleSubmit = useCallback(async () => {
    const valid = staged.filter((s) => !s.error)
    if (valid.length === 0) return
    setSubmitting(true)

    // Simulate async processing per file (mimics real upload)
    let successCount = 0
    let errorCount = 0
    for (const s of valid) {
      await new Promise((r) => setTimeout(r, 120))
      try {
        const common = {
          name: s.name,
          fileName: s.file.name,
          fileType: fileTypeFromName(s.file.name),
          fileSize: formatFileSize(s.file.size),
          category: s.category,
          sede: s.sede,
          responsable: s.responsable || null,
          expiresAt: s.noExpiry ? null : s.expiresAt || null,
          noExpiry: s.noExpiry,
          uploadedBy: "admin",
          area: (["permiso", "tramite"].includes(s.category) ? "ambiental" : "corporativo") as "ambiental" | "corporativo",
        }
        if (s.isRenewal && s.duplicate) {
          renewDoc(s.duplicate.id, common)
        } else {
          addDoc(common)
        }
        successCount++
      } catch {
        errorCount++
        patchStaged(s.id, { error: "No se pudo procesar el archivo. Intenta de nuevo." })
      }
    }
    setSubmitting(false)

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? "Documento cargado correctamente."
          : `${successCount} documentos cargados correctamente.`,
        { description: errorCount > 0 ? `${errorCount} archivo(s) no pudieron procesarse.` : undefined },
      )
    }
    if (errorCount === 0) {
      setStaged([])
      onClose()
    }
  }, [staged, onClose])

  function handleClose() {
    setStaged([])
    onClose()
  }

  const canSubmit = staged.length > 0 && staged.some((s) => !s.error) && !submitting

  return (
    <Drawer.Root open={open} onOpenChange={(v) => !v && handleClose()} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-background shadow-2xl outline-none"
          aria-label="Subir documentos"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <Drawer.Title className="font-semibold text-foreground">Subir documentos</Drawer.Title>
              <p className="mt-0.5 text-xs text-muted-foreground">PDF, Word, imagen · máx. {MAX_SIZE_MB} MB por archivo</p>
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 transition-colors select-none",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
              )}
            >
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-full transition-colors", dragging ? "bg-primary/10" : "bg-muted")}>
                <Upload className={cn("h-5 w-5 transition-colors", dragging ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {dragging ? "Suelta los archivos aquí" : "Arrastra archivos o haz clic para seleccionar"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">PDF, Word (.doc/.docx), imágenes</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED}
                className="sr-only"
                onChange={handleInputChange}
              />
            </div>

            {/* Staged files */}
            {staged.length > 0 && (
              <div className="mt-5 flex flex-col gap-4">
                {staged.map((s) => (
                  <StagedFileCard
                    key={s.id}
                    staged={s}
                    onRemove={() => removeStaged(s.id)}
                    onPatch={(patch) => patchStaged(s.id, patch)}
                    onNameChange={(name) => handleNameChange(s.id, name)}
                    onSedeChange={(sede) => handleSedeChange(s.id, sede)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                  canSubmit
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "cursor-not-allowed bg-muted text-muted-foreground",
                )}
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Procesando…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {staged.filter((s) => !s.error).length > 1
                      ? `Subir ${staged.filter((s) => !s.error).length} documentos`
                      : "Subir documento"}
                  </>
                )}
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

// ─── Staged File Card ─────────────────────────────────────────────────────────

interface StagedFileCardProps {
  staged: StagedFile
  onRemove: () => void
  onPatch: (patch: Partial<StagedFile>) => void
  onNameChange: (name: string) => void
  onSedeChange: (sede: string) => void
}

function StagedFileCard({ staged: s, onRemove, onPatch, onNameChange, onSedeChange }: StagedFileCardProps) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-4",
      s.error ? "border-destructive/40 bg-destructive/5" : "border-border",
    )}>
      {/* File header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {fileIcon(s.file.name)}
          <span className="truncate text-xs text-muted-foreground">{s.file.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatFileSize(s.file.size)}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Quitar archivo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Error state */}
      {s.error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">{s.error}</p>
        </div>
      )}

      {/* Duplicate warning */}
      {!s.error && s.duplicate && !s.isRenewal && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Ya existe un documento con este nombre en esta sede
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                &quot;{s.duplicate.name}&quot; — subido el {new Date(s.duplicate.uploadedAt).toLocaleDateString("es-MX")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => onPatch({ isRenewal: true })}
                  className="flex items-center gap-1.5 rounded-md bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Es una renovación
                </button>
                <button
                  onClick={() => onPatch({ duplicate: null })}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                >
                  Ignorar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renewal confirmed */}
      {!s.error && s.isRenewal && s.duplicate && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>El documento anterior se archivará automáticamente al subir.</span>
          <button
            onClick={() => onPatch({ isRenewal: false })}
            className="ml-auto shrink-0 text-emerald-600 hover:underline"
          >
            Deshacer
          </button>
        </div>
      )}

      {/* Metadata form */}
      {!s.error && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Document name */}
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Nombre del documento</label>
            <input
              value={s.name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ej. Licencia Ambiental — Planta Norte"
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo de documento</label>
            <select
              value={s.category}
              onChange={(e) => onPatch({ category: e.target.value as DocCategory })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {(Object.entries(CATEGORY_LABELS) as [DocCategory, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Sede */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Sede</label>
            <select
              value={s.sede}
              onChange={(e) => onSedeChange(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SEDES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Responsable */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Responsable</label>
            <select
              value={s.responsable}
              onChange={(e) => onPatch({ responsable: e.target.value })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Sin asignar</option>
              {RESPONSABLES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Expiry */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Fecha de vencimiento</label>
            <input
              type="date"
              value={s.expiresAt}
              disabled={s.noExpiry}
              onChange={(e) => onPatch({ expiresAt: e.target.value })}
              className={cn(
                "h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20",
                s.noExpiry && "cursor-not-allowed opacity-40",
              )}
            />
          </div>

          {/* No expiry toggle */}
          <div className="flex items-end pb-1">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={s.noExpiry}
                onChange={(e) => onPatch({ noExpiry: e.target.checked, expiresAt: e.target.checked ? "" : s.expiresAt })}
                className="h-4 w-4 rounded border-border accent-foreground"
              />
              <span className="text-xs text-muted-foreground">No expira</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
