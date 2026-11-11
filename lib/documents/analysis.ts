import { MATERIA_KEYS, type Materia } from '../ingest/categories'
import { TRIGGERS, type TriggerKey, type Triggers } from '../monitoring-profile'

// Lo que se detecta de un documento que sube el cliente. Haiku propone, el
// cliente confirma o edita, y solo lo confirmado alimenta el matching de RegWatch
// (señales como respuestas a las preguntas del perfil) y el vencimiento.

export const DOC_TYPES = {
  permiso: 'Permiso',
  licencia: 'Licencia',
  autorizacion: 'Autorización',
  registro: 'Registro',
  concesion: 'Concesión',
  constancia: 'Constancia',
  certificado: 'Certificado',
  contrato: 'Contrato',
  acta: 'Acta o escritura',
  poliza: 'Póliza',
  otro: 'Otro',
} as const
export type DocType = keyof typeof DOC_TYPES
export const DOC_TYPE_KEYS = Object.keys(DOC_TYPES) as DocType[]

export const DOC_STATES = {
  vigente: 'Vigente',
  vencido: 'Vencido',
  en_tramite: 'En trámite',
  desconocido: 'No determinado',
} as const
export type DocState = keyof typeof DOC_STATES
export const DOC_STATE_KEYS = Object.keys(DOC_STATES) as DocState[]

/** Respuesta a una pregunta del perfil de monitoreo que el documento evidencia. */
export type DocSignal = { key: TriggerKey; value: string }

export type DocAnalysis = {
  tipo: DocType
  autoridad: string | null
  estado: DocState
  materia: Materia
  vigenciaInicio: string | null // YYYY-MM-DD
  vigenciaFin: string | null // YYYY-MM-DD
  senales: DocSignal[]
}

/** none: no se pudo leer o no se analiza ese formato. analyzing: Otero lo está leyendo. detected: espera confirmación. */
export type AnalysisStatus = 'none' | 'analyzing' | 'detected' | 'confirmed'

/** Una lectura que lleva más que esto se da por perdida (la función se cortó) y el cliente completa a mano. */
export const ANALYZING_STALE_MS = 10 * 60 * 1000

/** Estado que ve el cliente: una lectura vieja deja de mostrarse como "leyendo". */
export function visibleStatus(row: { analysisStatus: string | null; uploadedAt: Date | string }, now = Date.now()): AnalysisStatus {
  const status = (row.analysisStatus ?? 'none') as AnalysisStatus
  return status === 'analyzing' && now - new Date(row.uploadedAt).getTime() > ANALYZING_STALE_MS ? 'none' : status
}

const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const isoDate = (v: unknown) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null
const pick = <T extends string>(v: unknown, keys: readonly T[], fallback: T): T =>
  typeof v === 'string' && (keys as readonly string[]).includes(v) ? (v as T) : fallback

/** Solo respuestas válidas y afirmativas: un documento evidencia que algo aplica, no que no aplica. */
export function sanitizeSignals(input: unknown): DocSignal[] {
  if (!Array.isArray(input)) return []
  const out = new Map<TriggerKey, string>()
  for (const entry of input) {
    const trigger = TRIGGERS.find(t => t.key === entry?.key)
    if (!trigger || entry.value === 'no' || !trigger.options.some(o => o.value === entry.value)) continue
    if (!out.has(trigger.key)) out.set(trigger.key, entry.value)
  }
  return [...out].map(([key, value]) => ({ key, value }))
}

/** Normaliza lo que llega de la IA o del formulario del cliente a un análisis válido. */
export function sanitizeAnalysis(input: Record<string, unknown>): DocAnalysis {
  let inicio = isoDate(input.vigenciaInicio)
  const fin = isoDate(input.vigenciaFin)
  if (inicio && fin && inicio > fin) inicio = null
  return {
    tipo: pick(input.tipo, DOC_TYPE_KEYS, 'otro'),
    autoridad: str(input.autoridad, 120),
    estado: pick(input.estado, DOC_STATE_KEYS, 'desconocido'),
    materia: pick(input.materia, MATERIA_KEYS, 'otra'),
    vigenciaInicio: inicio,
    vigenciaFin: fin,
    senales: sanitizeSignals(input.senales),
  }
}

type SignalSource = { analysis: DocAnalysis | null; analysisStatus: string | null }

/** Señales de los documentos confirmados. Si dos documentos contestan la misma pregunta, gana la respuesta más exigente. */
export function documentTriggers(docs: SignalSource[]): Triggers {
  const out: Triggers = {}
  for (const doc of docs) {
    if (doc.analysisStatus !== 'confirmed' || !doc.analysis) continue
    for (const { key, value } of doc.analysis.senales) {
      const options = TRIGGERS.find(t => t.key === key)?.options.map(o => o.value) ?? []
      const current = out[key]
      if (!current || options.indexOf(value) > options.indexOf(current)) out[key] = value
    }
  }
  return out
}

/** El perfil que confirmó el cliente manda; el documento llena lo vacío y corrige un "no". */
export function mergeTriggers(profile: Triggers | null | undefined, fromDocs: Triggers): Triggers {
  const out: Triggers = { ...profile }
  for (const [key, value] of Object.entries(fromDocs) as [TriggerKey, string][]) {
    const current = out[key]
    if (!current || current === 'no') out[key] = value
  }
  return out
}

export type ExpiryState = 'vencido' | 'por_vencer' | 'vigente'

/** Estado por fecha de fin de vigencia; los 30 días previos cuentan como por vencer. */
export function expiryState(fin: string | null, today: string): ExpiryState | null {
  if (!fin) return null
  if (fin < today) return 'vencido'
  const days = (Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000
  return days <= 30 ? 'por_vencer' : 'vigente'
}

/** Lo más repetido entre las partes; en empate gana la que aparece primero. */
function mostCommon<T>(values: (T | null)[], skip: (v: T) => boolean, key: (v: T) => string = String): T | null {
  const counts = new Map<string, { value: T; n: number }>()
  for (const v of values) {
    if (v === null || skip(v)) continue
    const k = key(v).toLowerCase()
    const entry = counts.get(k)
    if (entry) entry.n++
    else counts.set(k, { value: v, n: 1 })
  }
  let best: { value: T; n: number } | null = null
  for (const e of counts.values()) if (!best || e.n > best.n) best = e
  return best?.value ?? null
}

/**
 * Junta el análisis de las partes de un documento largo (en orden de lectura).
 * Tipo, autoridad y materia: lo más repetido. Vigencia y estado: lo último que aparece, porque
 * transitorios, prórrogas y vigencias suelen estar al final. Señales: la respuesta más exigente de cada pregunta.
 */
export function mergeAnalyses(parts: DocAnalysis[]): DocAnalysis {
  const last = <T>(pick: (a: DocAnalysis) => T | null, skip: (v: T) => boolean = () => false): T | null => {
    for (let i = parts.length - 1; i >= 0; i--) {
      const v = pick(parts[i])
      if (v !== null && !skip(v)) return v
    }
    return null
  }
  const first = <T>(pick: (a: DocAnalysis) => T | null): T | null => {
    for (const p of parts) {
      const v = pick(p)
      if (v !== null) return v
    }
    return null
  }
  const senales = new Map<TriggerKey, string>()
  for (const part of parts) {
    for (const { key, value } of part.senales) {
      const options = TRIGGERS.find(t => t.key === key)?.options.map(o => o.value) ?? []
      const current = senales.get(key)
      if (!current || options.indexOf(value) > options.indexOf(current)) senales.set(key, value)
    }
  }
  return sanitizeAnalysis({
    tipo: mostCommon(parts.map(p => p.tipo), v => v === 'otro') ?? 'otro',
    autoridad: mostCommon(parts.map(p => p.autoridad), () => false),
    estado: last(p => p.estado, v => v === 'desconocido') ?? 'desconocido',
    materia: mostCommon(parts.map(p => p.materia), v => v === 'otra') ?? 'otra',
    vigenciaInicio: first(p => p.vigenciaInicio),
    vigenciaFin: last(p => p.vigenciaFin),
    senales: [...senales].map(([key, value]) => ({ key, value })),
  })
}
