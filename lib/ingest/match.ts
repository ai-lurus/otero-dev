import { MATERIAS, type Materia } from './categories'
import { profileStatus, scianLabel, sectorOf, TRIGGERS, type TriggerKey, type Triggers } from '@/lib/monitoring-profile'

// Qué clientes se ven afectados por una publicación, según su materia y el
// perfil de monitoreo del cliente (lib/monitoring-profile.ts): materias que
// le vigila el despacho, actividad SCIAN y preguntas de operación. Si el
// perfil no está capturado, se cae a palabras clave del giro y actividades.

// Materias que tocan a cualquier empresa que opere en México.
const GENERAL: Partial<Record<Materia, string>> = {
  fiscal: 'Materia fiscal: aplica a toda empresa contribuyente',
  laboral: 'Materia laboral: aplica a toda empresa con trabajadores',
  datos_personales: 'Datos personales: aplica a toda empresa que trate datos de clientes o empleados',
  corporativo: 'Corporativo y mercantil: aplica a toda sociedad mercantil',
  anticorrupcion_pld: 'Anticorrupción: aplica a toda empresa',
}

// Materias sectoriales: aplican si el perfil menciona alguna de estas palabras.
const SECTOR: Partial<Record<Materia, string[]>> = {
  energia: ['energ', 'eléctric', 'electric', 'hidrocarbur', 'petr', 'gas', 'combustib', 'gasolin', 'solar', 'eólic'],
  ambiental: ['ambient', 'residu', 'emision', 'emisión', 'manufactur', 'planta', 'industri', 'miner', 'químic', 'agua', 'construc'],
  seguridad_higiene: ['manufactur', 'planta', 'industri', 'construc', 'almac', 'logíst', 'logist', 'maquinaria', 'nom-0'],
  comercio_exterior: ['import', 'export', 'aduan', 'comercio exterior', 'immex', 'maquila'],
  financiero: ['financ', 'banc', 'crédit', 'credit', 'seguro', 'fintech', 'sofom', 'bursát', 'inversi'],
  salud: ['salud', 'farmac', 'hospital', 'médic', 'medic', 'aliment', 'cosmét', 'cofepris', 'sanitar', 'clínic'],
  propiedad_intelectual: ['marca', 'patente', 'software', 'tecnolog', 'franquic', 'contenido'],
  competencia: ['fusión', 'adquisici', 'concentraci', 'licitaci'],
}

// Por materia sectorial: preguntas de operación que la activan (con las
// respuestas que cuentan) y sectores o subsectores SCIAN donde aplica.
type Rule = { triggers?: Partial<Record<TriggerKey, string[]>>; scian?: string[] }
const YES = ['si']
const RULES: Partial<Record<Materia, Rule>> = {
  energia: { triggers: { hidrocarburos: YES }, scian: ['22', '211', '324', '468', '486'] },
  ambiental: {
    triggers: {
      residuos_peligrosos: ['micro', 'pequeno', 'gran'], emisiones: YES, agua_concesion: YES,
      agua_descarga: ['drenaje', 'cuerpo_nacional'], costero: YES, hidrocarburos: YES,
    },
    scian: ['11', '21', '22', '23', '31', '562'],
  },
  seguridad_higiene: { triggers: { hidrocarburos: YES, residuos_peligrosos: ['pequeno', 'gran'] }, scian: ['21', '22', '23', '31', '48'] },
  comercio_exterior: { triggers: { comercio_exterior: YES, immex: YES } },
  financiero: { scian: ['52'] },
  salud: { triggers: { sanitario: YES }, scian: ['311', '312', '325', '62', '722'] },
  propiedad_intelectual: { scian: ['51', '54', '334'] },
}

export type MatchProfile = {
  industry?: string | null
  description?: string | null
  activities?: string | null
  riesgos?: string | null
  certifications?: string | null
  scian?: string | null
  stateList?: string[] | null
  triggers?: Triggers | null
  materias?: string[] | null
}

export type Match = { applies: boolean; reason: string }

/** Motivo por el que el perfil estructurado activa la materia, o null. */
function ruleHit(materia: Materia, profile: MatchProfile): string | null {
  const rule = RULES[materia]
  if (!rule) return null
  for (const [key, values] of Object.entries(rule.triggers ?? {}) as [TriggerKey, string[]][]) {
    const answer = profile.triggers?.[key]
    if (answer && values.includes(answer)) {
      const trigger = TRIGGERS.find(t => t.key === key)!
      const option = trigger.options.find(o => o.value === answer)
      return `${trigger.label.replace(/^¿|\?$/g, '')}: ${option?.label ?? answer}`
    }
  }
  const code = profile.scian
  if (code && rule.scian?.some(c => c === code || c === sectorOf(code))) return `Su actividad es ${scianLabel(code)}`
  return null
}

export function matchTenant(materia: string | null, profile: MatchProfile): Match {
  if (!materia || materia === 'otra') return { applies: false, reason: 'Sin materia clara; revisa si aplica' }
  if (profile.materias?.length && !profile.materias.includes(materia)) {
    return { applies: false, reason: `El despacho no le vigila ${MATERIAS[materia as Materia] ?? materia}` }
  }
  const general = GENERAL[materia as Materia]
  if (general) return { applies: true, reason: general }

  const hit = ruleHit(materia as Materia, profile)
  if (hit) return { applies: true, reason: hit }
  const structured = profileStatus(profile) !== 'vacio'

  const keywords = SECTOR[materia as Materia] ?? []
  const text = [profile.industry, profile.description, profile.activities, profile.riesgos, profile.certifications]
    .filter(Boolean).join(' ').toLowerCase()
  if (!text.trim() && !structured) return { applies: false, reason: 'Perfil de monitoreo sin capturar: solo recibe materias generales' }
  const word = keywords.find((k) => text.includes(k))
  if (word) return { applies: true, reason: `Su perfil menciona "${excerpt(text, word)}"` }
  return { applies: false, reason: structured ? 'Su perfil de monitoreo no activa esta materia' : 'Su giro no parece relacionado con esta materia' }
}

// La palabra completa del perfil donde cayó la coincidencia.
function excerpt(text: string, hit: string) {
  const i = text.indexOf(hit)
  const start = text.lastIndexOf(' ', i) + 1
  const end = text.indexOf(' ', i + hit.length)
  return text.slice(start, end === -1 ? undefined : end).replace(/[.,;:()]/g, '')
}
