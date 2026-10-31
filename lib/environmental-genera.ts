// Géneros de la materia ambiental según el criterio de RIVA IA (doc «Materias
// ambientales de la plataforma», corte 26-oct-2026). La ingesta etiqueta cada
// publicación ambiental con uno; las especies se cargarán con el Excel del catálogo.

export const ENVIRONMENTAL_GENERA = {
  G01: 'Impacto ambiental',
  G02: 'Riesgo ambiental',
  G03: 'Atmósfera: fuentes fijas',
  G04: 'Registro de emisiones y transferencia de contaminantes (COA)',
  G05: 'Cambio climático',
  G06: 'Residuos peligrosos',
  G07: 'Residuos de manejo especial',
  G08: 'Residuos sólidos urbanos',
  G09: 'Suelos contaminados y emergencias ambientales',
  G10: 'Agua: concesiones y uso',
  G11: 'Agua: descargas de aguas residuales',
  G12: 'Ruido, vibraciones y olores',
  G13: 'Biodiversidad, forestal y zona costera',
  G14: 'Sector hidrocarburos (ASEA)',
  G15: 'Autorregulación y auditoría ambiental',
  G16: 'Inspección, procedimiento y responsabilidad ambiental',
  G17: 'Economía circular (REP)',
} as const

export type EnvironmentalGenus = keyof typeof ENVIRONMENTAL_GENERA
export const GENUS_KEYS = Object.keys(ENVIRONMENTAL_GENERA) as EnvironmentalGenus[]
export const isGenus = (value: unknown): value is EnvironmentalGenus => typeof value === 'string' && value in ENVIRONMENTAL_GENERA

export const AMBITOS = { federal: 'Federal', estatal: 'Estatal', municipal: 'Municipal' } as const
export type Ambito = keyof typeof AMBITOS
export const isAmbito = (value: unknown): value is Ambito => typeof value === 'string' && value in AMBITOS

/** ¿Hay obligaciones para la empresa? Como en la tabla del despacho: Sí, No o "Definir si hay obligaciones". */
export const OBLIGATION_STATUSES = { si: 'Sí', no: 'No', por_definir: 'Por definir' } as const
export type ObligationStatus = keyof typeof OBLIGATION_STATUSES
