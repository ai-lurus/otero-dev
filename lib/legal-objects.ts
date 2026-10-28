// Catálogo de objetos legales: qué hace una publicación para quien la lee.
// Son 12 objetos con acción, en 5 familias, y 2 ocultos que no piden acción.
// El catálogo lo define el despacho; la ingesta clasifica con estos valores.

export const LEGAL_OBJECTS = {
  obligacion: { label: 'Obligación', family: 'deberes' },
  requisito: { label: 'Requisito', family: 'deberes' },
  aviso_obligatorio: { label: 'Aviso obligatorio', family: 'deberes' },
  prohibicion: { label: 'Prohibición', family: 'restricciones' },
  sancion: { label: 'Sanción', family: 'restricciones' },
  advertencia: { label: 'Advertencia', family: 'restricciones' },
  plazo: { label: 'Plazo', family: 'plazos' },
  prorroga: { label: 'Prórroga', family: 'plazos' },
  estimulo: { label: 'Estímulo', family: 'oportunidades' },
  consulta_publica: { label: 'Consulta pública', family: 'oportunidades' },
  convocatoria: { label: 'Convocatoria', family: 'oportunidades' },
  derogacion: { label: 'Derogación', family: 'cambios' },
  nombramiento: { label: 'Nombramiento', family: 'sin_accion' },
  sin_impacto: { label: 'Sin impacto', family: 'sin_accion' },
} as const

export type LegalObject = keyof typeof LEGAL_OBJECTS
export const LEGAL_OBJECT_KEYS = Object.keys(LEGAL_OBJECTS) as LegalObject[]

export const OBJECT_FAMILIES = {
  deberes: 'Deberes',
  restricciones: 'Restricciones',
  plazos: 'Plazos',
  oportunidades: 'Oportunidades',
  cambios: 'Cambios',
  sin_accion: 'Sin acción',
} as const

export type ObjectFamily = keyof typeof OBJECT_FAMILIES

/** Un objeto detectado en una publicación, con el fragmento literal que lo sustenta. */
export type DetectedObject = { tipo: LegalObject; cita: string }

export const isLegalObject = (value: unknown): value is LegalObject =>
  typeof value === 'string' && value in LEGAL_OBJECTS

/** Conteo por familia, sin las que no piden acción: "Deberes 1 · Plazos 1". */
export function familyCounts(objects: readonly { tipo: string }[] | null | undefined) {
  const counts = new Map<ObjectFamily, number>()
  for (const object of objects ?? []) {
    if (!isLegalObject(object.tipo)) continue
    const family = LEGAL_OBJECTS[object.tipo].family
    if (family === 'sin_accion') continue
    counts.set(family, (counts.get(family) ?? 0) + 1)
  }
  return [...counts.entries()].map(([family, n]) => ({ family, label: OBJECT_FAMILIES[family], n }))
}
