"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StatusTag } from "@/components/ui/status-tag"
import { confirmDocumentsBatch } from "@/app/actions/documents"
import type { DocumentRow } from "@/lib/db/schema"
import { DOC_TYPES, type DocAnalysis, type DocType } from "@/lib/documents/analysis"
import { isHighConfidence } from "@/lib/documents/batch"
import { MATERIAS, type Materia } from "@/lib/ingest/categories"

const FIELD = "w-full rounded-md border border-border-strong bg-surface-raised px-2 py-1.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"

type Draft = { tipo: DocType; autoridad: string; materia: Materia; fin: string }

function draftOf(doc: DocumentRow): Draft {
  const a = doc.analysis
  return { tipo: a?.tipo ?? "otro", autoridad: a?.autoridad ?? "", materia: a?.materia ?? "otra", fin: a?.vigenciaFin ?? "" }
}

/** Lo editado en la fila sobre lo detectado; estado y señales se conservan tal cual. */
function analysisOf(doc: DocumentRow, draft: Draft): Record<string, unknown> {
  const a = doc.analysis
  return {
    tipo: draft.tipo,
    autoridad: draft.autoridad,
    estado: a?.estado ?? "desconocido",
    materia: draft.materia,
    vigenciaInicio: a?.vigenciaInicio ?? null,
    vigenciaFin: draft.fin,
    senales: a?.senales ?? [],
  }
}

function confidence(doc: DocumentRow, draft: Draft): "alta" | "revisar" | "sin" {
  if (!doc.analysis) return "sin"
  const edited: DocAnalysis = { ...doc.analysis, tipo: draft.tipo, autoridad: draft.autoridad || null, materia: draft.materia }
  return isHighConfidence(edited) ? "alta" : "revisar"
}

export function BatchReview({
  docs,
  onConfirmed,
  onDetails,
}: {
  docs: DocumentRow[]
  onConfirmed: (rows: DocumentRow[]) => void
  /** Abre el diálogo completo (señales, estado, inicio de vigencia) para un documento. */
  onDetails: (doc: DocumentRow) => void
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const pendingDocs = docs.filter(d => d.analysisStatus !== "confirmed")
  const draft = (d: DocumentRow) => drafts[d.id] ?? draftOf(d)
  const patch = (d: DocumentRow, change: Partial<Draft>) =>
    setDrafts(prev => ({ ...prev, [d.id]: { ...draft(d), ...change } }))

  const high = pendingDocs.filter(d => confidence(d, draft(d)) === "alta")
  const confirmable = pendingDocs.filter(d => d.analysis)

  function confirm(list: DocumentRow[]) {
    if (list.length === 0) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await confirmDocumentsBatch(list.map(d => ({ id: d.id, analysis: analysisOf(d, draft(d)) })))
        onConfirmed(result.confirmed)
        if (result.failed.length > 0) setError(`No se pudieron confirmar ${result.failed.length} documento(s). Intenta de nuevo.`)
      } catch {
        setError("No se pudo confirmar. Intenta de nuevo.")
      }
    })
  }

  if (docs.length === 0) return null

  return (
    <section aria-labelledby="batch-review-title" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="batch-review-title" className="text-heading text-ink">Confirma lo que Otero detectó</h3>
          <p className="mt-1 text-body-sm text-ink-muted">
            {pendingDocs.length === 0
              ? "Todos los documentos están confirmados."
              : `${pendingDocs.length} por confirmar. Al confirmar, Otero usa los datos para saber qué publicaciones te tocan.`}
          </p>
        </div>
        {pendingDocs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => confirm(high)} disabled={pending || high.length === 0}>
              Confirmar los de alta confianza ({high.length})
            </Button>
            <Button onClick={() => confirm(confirmable)} disabled={pending || confirmable.length === 0}>
              {pending ? <><Spinner /> Confirmando…</> : `Confirmar todos (${confirmable.length})`}
            </Button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-3 text-body-sm text-risk">{error}</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {docs.map(doc => {
          const d = draft(doc)
          const level = confidence(doc, d)
          const confirmed = doc.analysisStatus === "confirmed"
          return (
            <li key={doc.id} className="rounded-md border border-border bg-surface-raised p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 truncate text-body-sm font-semibold text-ink">{doc.name}</p>
                {confirmed ? <StatusTag status="ok" label="Confirmado" />
                  : level === "alta" ? <StatusTag status="info" label="Alta confianza" />
                  : level === "revisar" ? <StatusTag status="warn" label="Revisa los datos" />
                  : <StatusTag status="warn" label="Sin lectura" />}
              </div>
              {!confirmed && (
                doc.analysis ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <select aria-label={`Tipo de ${doc.name}`} className={FIELD} value={d.tipo} onChange={e => patch(doc, { tipo: e.target.value as DocType })}>
                      {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input aria-label={`Autoridad de ${doc.name}`} className={FIELD} value={d.autoridad} maxLength={120} placeholder="Autoridad" onChange={e => patch(doc, { autoridad: e.target.value })} />
                    <select aria-label={`Materia de ${doc.name}`} className={FIELD} value={d.materia} onChange={e => patch(doc, { materia: e.target.value as Materia })}>
                      {Object.entries(MATERIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input aria-label={`Vence el, ${doc.name}`} type="date" className={FIELD} value={d.fin} onChange={e => patch(doc, { fin: e.target.value })} />
                  </div>
                ) : (
                  <p className="mt-2 text-caption text-ink-muted">Otero no pudo leer este documento. Captura los datos a mano.</p>
                )
              )}
              {!confirmed && (
                <div className="mt-2 flex gap-2">
                  {doc.analysis && (
                    <Button size="sm" variant="outline" onClick={() => confirm([doc])} disabled={pending}>Confirmar</Button>
                  )}
                  <Button size="sm" variant="link" onClick={() => onDetails(doc)}>{doc.analysis ? "Más datos" : "Completar datos"}</Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
