"use client"

import { useState, useTransition } from "react"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { confirmDocumentAnalysis } from "@/app/actions/documents"
import type { DocumentRow } from "@/lib/db/schema"
import {
  DOC_STATES, DOC_TYPES, type DocSignal, type DocState, type DocType,
} from "@/lib/documents/analysis"
import { MATERIAS, type Materia } from "@/lib/ingest/categories"
import { TRIGGERS, type TriggerKey } from "@/lib/monitoring-profile"

const FIELD = "w-full rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
const LABEL = "mb-1 block text-label text-ink-muted"

function triggerOf(key: TriggerKey) {
  return TRIGGERS.find(t => t.key === key)!
}

/** "Genera residuos peligrosos: Hasta 400 kg al año" */
export function signalLabel({ key, value }: DocSignal) {
  const trigger = triggerOf(key)
  const option = trigger.options.find(o => o.value === value)
  return `${trigger.label.replace(/^¿|\?$/g, "")}: ${option?.label ?? value}`
}

export function AnalysisDialog({
  doc,
  onClose,
  onSaved,
}: {
  doc: DocumentRow
  onClose: () => void
  onSaved: (doc: DocumentRow) => void
}) {
  const detected = doc.analysis
  const [tipo, setTipo] = useState<DocType>(detected?.tipo ?? "otro")
  const [autoridad, setAutoridad] = useState(detected?.autoridad ?? "")
  const [estado, setEstado] = useState<DocState>(detected?.estado ?? "desconocido")
  const [materia, setMateria] = useState<Materia>(detected?.materia ?? "otra")
  const [inicio, setInicio] = useState(detected?.vigenciaInicio ?? "")
  const [fin, setFin] = useState(detected?.vigenciaFin ?? doc.expiresAt ?? "")
  const [senales, setSenales] = useState<DocSignal[]>(detected?.senales ?? [])
  const [newKey, setNewKey] = useState<TriggerKey | "">("")
  const [newValue, setNewValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const available = TRIGGERS.filter(t => !senales.some(s => s.key === t.key))
  const newTrigger = newKey ? triggerOf(newKey) : null
  const newOptions = newTrigger?.options.filter(o => o.value !== "no") ?? []

  function addSignal() {
    if (!newKey || !newValue) return
    setSenales(prev => [...prev, { key: newKey, value: newValue }])
    setNewKey("")
    setNewValue("")
  }

  function save() {
    setError(null)
    startTransition(async () => {
      try {
        const row = await confirmDocumentAnalysis(doc.id, {
          tipo, autoridad, estado, materia, vigenciaInicio: inicio, vigenciaFin: fin, senales,
        })
        onSaved(row)
      } catch {
        setError("No se pudo guardar. Intenta de nuevo.")
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-title"
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface-raised p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="analysis-title" className="text-heading text-ink">Confirma los datos del documento</h2>
            <p className="mt-1 truncate text-caption text-ink-muted">{doc.name}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar">
            <XIcon />
          </Button>
        </div>

        <p className="mb-6 text-body-sm text-ink-muted">
          {detected
            ? "Otero leyó el documento y detectó esto. Corrige lo que no coincida; al confirmar, Otero lo usa para saber qué publicaciones te tocan."
            : "Otero no pudo leer este documento. Captura los datos para que cuenten en tu monitoreo."}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="doc-tipo">Tipo</label>
            <select id="doc-tipo" className={FIELD} value={tipo} onChange={e => setTipo(e.target.value as DocType)}>
              {Object.entries(DOC_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="doc-estado">Estado</label>
            <select id="doc-estado" className={FIELD} value={estado} onChange={e => setEstado(e.target.value as DocState)}>
              {Object.entries(DOC_STATES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="doc-autoridad">Autoridad</label>
            <input id="doc-autoridad" className={FIELD} value={autoridad} maxLength={120} placeholder="SEMARNAT, ASEA, COFEPRIS…" onChange={e => setAutoridad(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} htmlFor="doc-materia">Materia</label>
            <select id="doc-materia" className={FIELD} value={materia} onChange={e => setMateria(e.target.value as Materia)}>
              {Object.entries(MATERIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL} htmlFor="doc-inicio">Vigente desde</label>
            <input id="doc-inicio" type="date" className={FIELD} value={inicio} onChange={e => setInicio(e.target.value)} />
          </div>
          <div>
            <label className={LABEL} htmlFor="doc-fin">Vence el</label>
            <input id="doc-fin" type="date" className={FIELD} value={fin} onChange={e => setFin(e.target.value)} />
          </div>
        </div>
        <p className="mt-2 text-caption text-ink-muted">
          Si hay fecha de vencimiento, el documento entra a tus alertas de vencimiento.
        </p>

        <fieldset className="mt-6">
          <legend className="text-label text-ink">Lo que este documento demuestra de tu operación</legend>
          {senales.length === 0 ? (
            <p className="mt-2 text-body-sm text-ink-muted">Sin señales para el monitoreo.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {senales.map(s => (
                <li key={s.key} className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2 text-body-sm text-ink">
                  <span>{signalLabel(s)}</span>
                  <Button variant="ghost" size="icon-sm" aria-label={`Quitar: ${signalLabel(s)}`} onClick={() => setSenales(prev => prev.filter(x => x.key !== s.key))}>
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {available.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <select aria-label="Pregunta del perfil" className={FIELD} value={newKey} onChange={e => { setNewKey(e.target.value as TriggerKey | ""); setNewValue("") }}>
                <option value="">Agregar una señal…</option>
                {available.map(t => <option key={t.key} value={t.key}>{t.label.replace(/^¿|\?$/g, "")}</option>)}
              </select>
              {newTrigger && (
                <select aria-label="Respuesta" className={FIELD} value={newValue} onChange={e => setNewValue(e.target.value)}>
                  <option value="">Respuesta…</option>
                  {newOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
              <Button variant="outline" onClick={addSignal} disabled={!newKey || !newValue}>Agregar</Button>
            </div>
          )}
        </fieldset>

        {error && <p role="alert" className="mt-4 text-body-sm text-risk">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>Revisar después</Button>
          <Button onClick={save} disabled={pending}>
            {pending ? <><Spinner /> Guardando…</> : "Confirmar datos"}
          </Button>
        </div>
      </div>
    </div>
  )
}
