import type { Materia } from './categories'

// Qué clientes podrían verse afectados por una publicación, según su materia y
// el giro/actividades del perfil de empresa. Es solo una propuesta: el socio
// revisa y decide antes de generar nada, y el cliente no ve el asunto hasta
// que se le envía desde la matriz regulatoria.

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

export type MatchProfile = {
  industry?: string | null
  description?: string | null
  activities?: string | null
  riesgos?: string | null
  certifications?: string | null
}

export type Match = { applies: boolean; reason: string }

export function matchTenant(materia: string | null, profile: MatchProfile): Match {
  if (!materia || materia === 'otra') return { applies: false, reason: 'Sin materia clara; revisa si aplica' }
  const general = GENERAL[materia as Materia]
  if (general) return { applies: true, reason: general }

  const keywords = SECTOR[materia as Materia] ?? []
  const text = [profile.industry, profile.description, profile.activities, profile.riesgos, profile.certifications]
    .filter(Boolean).join(' ').toLowerCase()
  if (!text.trim()) return { applies: false, reason: 'El cliente no tiene giro ni perfil de empresa capturado' }
  const hit = keywords.find((k) => text.includes(k))
  return hit
    ? { applies: true, reason: `Su perfil menciona "${excerpt(text, hit)}"` }
    : { applies: false, reason: 'Su giro no parece relacionado con esta materia' }
}

// La palabra completa del perfil donde cayó la coincidencia.
function excerpt(text: string, hit: string) {
  const i = text.indexOf(hit)
  const start = text.lastIndexOf(' ', i) + 1
  const end = text.indexOf(' ', i + hit.length)
  return text.slice(start, end === -1 ? undefined : end).replace(/[.,;:()]/g, '')
}
