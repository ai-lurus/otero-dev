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

/** none: no se pudo leer o no se analiza ese formato. detected: espera confirmación. */
export type AnalysisStatus = 'none' | 'detected' | 'confirmed'

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
