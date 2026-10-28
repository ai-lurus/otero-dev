export const SCOPES = ['regulatorio', 'legislativo'] as const
export type Scope = (typeof SCOPES)[number]
export const SCOPE_LABELS: Record<Scope, string> = { regulatorio: 'Regulatorio', legislativo: 'Legislativo' }

export const MATERIAS = [
  'Hidrocarburos',
  'Electricidad y energía',
  'Ambiental',
  'Seguridad industrial',
  'Laboral',
  'Transporte y movilidad',
  'Protección al consumidor',
  'Fiscal',
  'Justicia y penal',
  'Infraestructura de la calidad',
  'Administrativo y simplificación',
  'Desarrollo urbano',
  'Datos personales',
  'Corporativo y mercantil',
  'Anticorrupción y PLD',
  'Comercio exterior y aduanas',
  'Financiero',
  'Salud y sanitario',
  'Propiedad intelectual',
  'Competencia económica',
] as const

export const STATUSES = ['identificada', 'aceptada', 'cerrada', 'diferida', 'descartada', 'archivada'] as const
export const STATUS_LABELS: Record<string, string> = {
  identificada: 'Identificada',
  aceptada: 'Aceptada · en proceso',
  cerrada: 'Cerrada',
  diferida: 'Diferida',
  descartada: 'Descartada',
  archivada: 'Archivada',
}

export const ORIGINS = ['regwatch', 'despacho'] as const
export const ORIGIN_LABELS: Record<string, string> = { regwatch: 'RegWatch', despacho: 'Generado por el despacho' }

export const EXECUTION_STATUSES = ['por_hacer', 'en_curso', 'en_revision', 'cumplido'] as const
export const EXECUTION_LABELS: Record<string, string> = {
  por_hacer: 'Por hacer',
  en_curso: 'En curso',
  en_revision: 'En revisión',
  cumplido: 'Cumplido',
}

export const IMPACTS = ['alto', 'medio', 'bajo'] as const
export const IMPACT_LABELS: Record<string, string> = { alto: 'Impacto alto', medio: 'Impacto medio', bajo: 'Impacto bajo' }

export const DIRECTIONS = ['negativo', 'positivo', 'indirecto', 'neutro'] as const
export const DIRECTION_LABELS: Record<string, string> = {
  negativo: 'Negativo',
  positivo: 'Positivo',
  indirecto: 'Indirecto',
  neutro: 'Neutro',
}

export const STAGES: Record<Scope, { value: string; label: string }[]> = {
  regulatorio: [
    { value: 'publicado', label: 'Publicado en DOF' },
    { value: 'consulta_publica', label: 'Consulta pública' },
    { value: 'proyecto', label: 'Proyecto' },
    { value: 'administrativo', label: 'Administrativo' },
  ],
  legislativo: [
    { value: 'pendiente_turno', label: 'Pendiente de turno' },
    { value: 'turnada', label: 'Turnada a comisión' },
    { value: 'camara_revisora', label: 'En cámara revisora' },
    { value: 'aprobada', label: 'Aprobada' },
    { value: 'desechada', label: 'Desechada' },
  ],
}
export const STAGE_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(STAGES).flat().map((stage) => [stage.value, stage.label]),
)

export const INSTRUMENTS: Record<Scope, string[]> = {
  regulatorio: ['Decreto', 'Acuerdo', 'Aviso', 'Lineamientos', 'NOM', 'Proyecto de NOM', 'Otro'],
  legislativo: ['Iniciativa', 'Minuta', 'Punto de acuerdo'],
}

export function isOneOf<T extends readonly string[]>(list: T, value: unknown): value is T[number] {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}
