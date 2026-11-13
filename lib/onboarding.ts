import type { MonitoringFields } from '@/lib/monitoring-profile'
import { LONG_TEXT_MAX, MEDIUM_TEXT_MAX, SHORT_TEXT_MAX } from '@/lib/text-limits'

// Alta del cliente: un asistente por pasos que llena el perfil de la empresa y
// el perfil de monitoreo. Se da por terminada cuando el admin del cliente
// confirma su perfil (company_profiles.confirmedAt), así no hace falta otra
// columna. Los datos de ejemplo sirven para el demo.

export type CompanyFields = {
  description: string
  industry: string
  employees: string
  states: string // lo llena el paso de monitoreo (estados elegidos)
  activities: string
  certifications: string
  riesgos: string
}

export const EMPTY_COMPANY: CompanyFields = {
  description: '', industry: '', employees: '', states: '', activities: '', certifications: '', riesgos: '',
}

export const ONBOARDING_STEPS = [
  { id: 'empresa', label: 'Tu empresa', hint: 'A qué se dedica y dónde opera' },
  { id: 'monitoreo', label: 'Qué vigila Otero', hint: 'Actividad, estados y preguntas clave' },
  { id: 'equipo', label: 'Tu equipo', hint: 'Quién recibe y atiende los asuntos' },
  { id: 'regwatch', label: 'Cómo llega un asunto', hint: 'De la publicación a tu responsable' },
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id']

/** Empresa ficticia para el demo: una química en el Bajío, con materias ambientales y sanitarias. */
export const DEMO_COMPANY: CompanyFields = {
  description: 'Fabricamos resinas, adhesivos y recubrimientos base agua para la industria automotriz y de la construcción.',
  industry: 'Industria química',
  employees: '251 a 1,000',
  states: 'Guanajuato, Querétaro',
  activities: 'Producción de resinas y adhesivos, almacenamiento de solventes, importación de materias primas y exportación a Estados Unidos.',
  certifications: 'ISO 14001:2015, Industria Limpia (PROFEPA)',
  riesgos: 'Manejo de residuos peligrosos, emisiones de compuestos orgánicos volátiles y descarga de aguas residuales de proceso.',
}

export const DEMO_MONITORING: MonitoringFields = {
  scian: '325',
  stateList: ['Guanajuato', 'Querétaro'],
  employees: '251 a 1,000',
  triggers: {
    comercio_exterior: 'si',
    immex: 'si',
    hidrocarburos: 'no',
    residuos_peligrosos: 'gran',
    emisiones: 'si',
    agua_concesion: 'si',
    agua_descarga: 'drenaje',
    costero: 'no',
    sanitario: 'no',
    pld: 'no',
  },
}

export const COMPANY_LIMITS: Record<keyof CompanyFields, number> = {
  description: LONG_TEXT_MAX, industry: SHORT_TEXT_MAX, employees: 40, states: 300,
  activities: LONG_TEXT_MAX, certifications: MEDIUM_TEXT_MAX, riesgos: LONG_TEXT_MAX,
}

/** Recorta y limpia lo que llega del asistente: solo texto, con tope por campo. */
export function sanitizeCompany(input: Partial<Record<keyof CompanyFields, unknown>>): CompanyFields {
  const out = { ...EMPTY_COMPANY }
  for (const key of Object.keys(COMPANY_LIMITS) as (keyof CompanyFields)[]) {
    const value = input[key]
    out[key] = typeof value === 'string' ? value.trim().slice(0, COMPANY_LIMITS[key]) : ''
  }
  return out
}

/** Lo mínimo para avanzar del primer paso: a qué se dedica la empresa. */
export const companyReady = (c: CompanyFields) => Boolean(c.description.trim() && c.activities.trim())
