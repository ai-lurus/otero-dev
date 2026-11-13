import { expiryState, type DocAnalysis } from './documents/analysis'
import { COMPANY_LIMITS, type CompanyFields } from './onboarding'
import { SCIAN_SECTORS, SCIAN_SUBSECTORS, TRIGGERS, sectorOf, type TriggerKey, type Triggers } from './monitoring-profile'

// El alta empieza por los documentos: Otero los lee y propone el perfil de la
// empresa y las respuestas de monitoreo. El cliente lo confirma o lo corrige en
// los pasos siguientes. Todo aquí es puro: recibe los documentos y la fecha de hoy.

export type ProposalDoc = { id: string; name: string; analysis: DocAnalysis | null; analysisStatus: string }

/** Algo que Otero entendió, con los documentos de donde salió. */
export type Finding = {
  id: string
  kind: 'operacion' | 'empresa' | 'lugar' | 'certificacion' | 'vencimiento'
  title: string
  detail: string
  sources: string[]
}

export type Expiring = { name: string; fin: string; state: 'vencido' | 'por_vencer' }

export type Proposal = {
  readCount: number
  readingCount: number
  unreadCount: number
  company: Partial<CompanyFields>
  scian: string | null
  stateList: string[]
  triggers: Triggers
  triggerSources: Partial<Record<TriggerKey, string[]>>
  /** De qué documentos salió cada dato propuesto de la empresa (por llave del campo). */
  fieldSources: Record<string, string[]>
  findings: Finding[]
  expiring: Expiring[]
  answered: number
  total: number
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "2026-03-01" → "1 mar 2026". Sin zonas horarias: es una fecha de calendario. */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

const OPERATION_PHRASE: Partial<Record<TriggerKey, string>> = {
  comercio_exterior: 'importación o exportación de mercancías',
  immex: 'operación bajo programa IMMEX',
  hidrocarburos: 'manejo de combustibles o hidrocarburos',
  residuos_peligrosos: 'generación de residuos peligrosos',
  emisiones: 'fuentes de emisiones a la atmósfera',
  agua_concesion: 'uso de aguas nacionales con concesión',
  agua_descarga: 'descarga de aguas residuales',
  costero: 'inmuebles en zona costera o federal marítimo terrestre',
  sanitario: 'productos regulados por COFEPRIS',
  pld: 'actividades vulnerables de prevención de lavado de dinero',
}

const clip = (text: string, key: keyof CompanyFields) => text.slice(0, COMPANY_LIMITS[key]).trim()
const unique = <T,>(values: T[]) => [...new Set(values)]
const stripExt = (name: string) => name.replace(/\.[a-z0-9]{2,5}$/i, '')

/** Nombre del giro sin el código: "Industria química (incluye farmacéutica)". */
export function scianName(code: string | null | undefined): string | null {
  if (!code) return null
  return SCIAN_SUBSECTORS.find(s => s.code === code)?.label ?? SCIAN_SECTORS.find(s => s.code === code)?.label ?? null
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: string | null = null
  let n = 0
  for (const [v, c] of counts) if (c > n) { best = v; n = c }
  return best
}

export function buildProposal(docs: ProposalDoc[], today: string): Proposal {
  const read = docs.filter(d => d.analysis && (d.analysisStatus === 'detected' || d.analysisStatus === 'confirmed'))
  const readingCount = docs.filter(d => d.analysisStatus === 'analyzing').length

  // Preguntas: la respuesta más exigente entre documentos (misma regla que los documentos confirmados).
  const triggers = documentTriggersOf(read)
  const triggerSources: Partial<Record<TriggerKey, string[]>> = {}
  for (const t of TRIGGERS) {
    if (!triggers[t.key]) continue
    triggerSources[t.key] = read.filter(d => d.analysis!.senales.some(s => s.key === t.key)).map(d => d.name)
  }

  const hints = read.flatMap(d => (d.analysis!.empresa ? [{ doc: d, h: d.analysis!.empresa }] : []))
  const scian = mostCommon(hints.flatMap(({ h }) => (h.scian ? [h.scian] : [])))
  const stateList = unique(hints.flatMap(({ h }) => h.estados))
  const razon = mostCommon(hints.flatMap(({ h }) => (h.razonSocial ? [h.razonSocial] : [])))
  const actividades = unique(hints.flatMap(({ h }) => (h.actividad ? [h.actividad] : [])))
  const certs = unique([
    ...hints.flatMap(({ h }) => h.certificaciones),
    // Un certificado sin certificación detectada se nombra por su archivo; si ya la detectamos, el archivo sobra.
    ...read.filter(d => d.analysis!.tipo === 'certificado' && !d.analysis!.empresa?.certificaciones.length).map(d => stripExt(d.name)),
  ])

  const expiring: Expiring[] = read.flatMap(d => {
    const fin = d.analysis!.vigenciaFin
    const state = expiryState(fin, today)
    return fin && (state === 'vencido' || state === 'por_vencer') ? [{ name: d.name, fin, state }] : []
  }).sort((a, b) => (a.state === b.state ? a.fin.localeCompare(b.fin) : a.state === 'vencido' ? -1 : 1))

  const operations = TRIGGERS.flatMap(t => (triggers[t.key] && OPERATION_PHRASE[t.key] ? [OPERATION_PHRASE[t.key]!] : []))

  const company: Partial<CompanyFields> = {}
  const fieldSources: Record<string, string[]> = {}
  const setField = (key: keyof CompanyFields, value: string, sources: string[]) => {
    const clean = clip(value, key)
    if (!clean) return
    company[key] = clean
    fieldSources[key] = sources
  }
  const sourcesOf = (pick: (h: NonNullable<DocAnalysis['empresa']>) => unknown) =>
    hints.filter(({ h }) => Boolean(pick(h)) && (!Array.isArray(pick(h)) || (pick(h) as unknown[]).length > 0)).map(({ doc }) => doc.name)

  const description = [razon, ...actividades].filter(Boolean).join('. ').replace(/\.\./g, '.')
  if (description) setField('description', description.endsWith('.') ? description : `${description}.`, sourcesOf(h => h.razonSocial || h.actividad))
  if (operations.length) {
    setField('activities', `${operations[0][0].toUpperCase()}${operations[0].slice(1)}${operations.slice(1).map(o => `, ${o}`).join('')}.`,
      unique(Object.values(triggerSources).flat()))
  }
  const industry = scianName(scian)
  if (industry) setField('industry', industry, sourcesOf(h => h.scian))
  if (certs.length) setField('certifications', certs.join(', '), sourcesOf(h => h.certificaciones))
  if (stateList.length) fieldSources.states = sourcesOf(h => h.estados)
  if (scian) fieldSources.scian = sourcesOf(h => h.scian)
  if (expiring.length) {
    const lines = expiring.map(e => (e.state === 'vencido'
      ? `${stripExt(e.name)}: vencido desde el ${formatDay(e.fin)}.`
      : `${stripExt(e.name)}: vence el ${formatDay(e.fin)}.`))
    // Los nombres de archivo completos van en el texto para poder rastrearlos.
    setField('riesgos', expiring.map((e, i) => lines[i].replace(stripExt(e.name), e.name)).join(' '), expiring.map(e => e.name))
  }

  const findings: Finding[] = [
    ...TRIGGERS.flatMap(t => {
      const value = triggers[t.key]
      const option = t.options.find(o => o.value === value)
      return value && option && OPERATION_PHRASE[t.key]
        ? [{ id: `op-${t.key}`, kind: 'operacion' as const, title: capital(OPERATION_PHRASE[t.key]!), detail: `${t.label} ${option.label}`, sources: triggerSources[t.key] ?? [] }]
        : []
    }),
    ...(description ? [{ id: 'empresa', kind: 'empresa' as const, title: razon ?? 'A qué se dedica', detail: actividades[0] ?? 'Empresa identificada en tus documentos', sources: fieldSources.description ?? [] }] : []),
    ...(stateList.length ? [{ id: 'estados', kind: 'lugar' as const, title: `Opera en ${stateList.join(', ')}`, detail: 'Estados donde están tus establecimientos', sources: fieldSources.states ?? [] }] : []),
    ...(certs.length ? [{ id: 'certs', kind: 'certificacion' as const, title: certs.slice(0, 3).join(', '), detail: 'Certificaciones vigentes', sources: fieldSources.certifications ?? [] }] : []),
    ...expiring.map((e, i) => ({
      id: `exp-${i}`, kind: 'vencimiento' as const,
      title: e.state === 'vencido' ? 'Documento vencido' : 'Documento por vencer',
      detail: `${stripExt(e.name)} · ${e.state === 'vencido' ? 'venció' : 'vence'} el ${formatDay(e.fin)}`, sources: [e.name],
    })),
  ]

  return {
    readCount: read.length,
    readingCount,
    unreadCount: docs.filter(d => !read.includes(d) && d.analysisStatus !== 'analyzing').length,
    company,
    scian: scian && sectorOf(scian) ? scian : null,
    stateList,
    triggers,
    triggerSources,
    fieldSources,
    findings,
    expiring,
    answered: TRIGGERS.filter(t => triggers[t.key]).length,
    total: TRIGGERS.length,
  }
}

const capital = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`

function documentTriggersOf(docs: ProposalDoc[]): Triggers {
  const out: Triggers = {}
  for (const doc of docs) {
    for (const { key, value } of doc.analysis!.senales) {
      const options = TRIGGERS.find(t => t.key === key)?.options.map(o => o.value) ?? []
      const current = out[key]
      if (!current || options.indexOf(value) > options.indexOf(current)) out[key] = value
    }
  }
  return out
}
