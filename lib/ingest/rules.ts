// Reglas sin IA que se aplican al título de cada publicación al leer un
// sitio recurrente: el tipo de instrumento (por cómo arranca el título en el
// DOF) y el descarte de publicaciones que nunca generan un asunto, para no
// gastar tokens en categorizarlas. Lo descartado queda en el panel de ingesta
// con su motivo y el socio puede procesarlo de todos modos.

const norm = (title: string) => title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase()

/** Tipo de instrumento con los valores de lib/regulatory.ts (INSTRUMENTS.regulatorio). */
export function instrumentFromTitle(title: string): string | null {
  const t = norm(title)
  if (/^(PROYECTO DE NORMA OFICIAL MEXICANA|PROY-NOM)/.test(t)) return 'Proyecto de NOM'
  if (/^(NORMA OFICIAL MEXICANA|NOM-)/.test(t)) return 'NOM'
  if (/^DECRETO/.test(t)) return 'Decreto'
  if (/^ACUERDO/.test(t)) return 'Acuerdo'
  if (/^AVISO/.test(t)) return 'Aviso'
  if (/^LINEAMIENTOS/.test(t)) return 'Lineamientos'
  if (/^(RESOLUCION|[A-Z]+ RESOLUCION|REGLAS|DISPOSICIONES|CIRCULAR|CRITERIO|ESTATUTO|REGLAMENTO|MANUAL|CONVENIO|PROGRAMA)/.test(t)) return 'Otro'
  return null
}

// [patrón sobre el título normalizado (sin acentos, mayúsculas), motivo que ve el socio]
const NOISE: [RegExp, string][] = [
  [/^TIPO DE CAMBIO/, 'Tipo de cambio'],
  [/^TASAS? DE INTERES/, 'Tasas de interés'],
  [/^EQUIVALENCIA DE LAS MONEDAS/, 'Equivalencia de monedas'],
  [/^COSTO (PORCENTUAL PROMEDIO|DE CAPTACION)/, 'Costo de captación'],
  [/^VALOR DE LA UNIDAD DE INVERSION/, 'Valor de la UDI'],
  [/^EDICTO/, 'Edicto'],
  [/^(RESUMEN DE )?CONVOCATORIA.*(LICITACION|CONCURSO|PLAZA|SUBASTA|ENAJENACION)/, 'Convocatoria a licitación o concurso'],
  [/^(RESUMEN DE )?LICITACION/, 'Licitación'],
  [/^NOMBRAMIENTO/, 'Nombramiento'],
  [/^ESTADOS? (FINANCIEROS?|DE SITUACION|DE RESULTADOS|DE POSICION)/, 'Estados financieros'],
  [/^BALANCE GENERAL/, 'Estados financieros'],
  [/^MANUAL DE (ORGANIZACION|PROCEDIMIENTOS)/, 'Manual interno de una dependencia'],
  [/^CONVENIO .*(COORDINACION|COLABORACION|REASIGNACION|SUBSIDIO)/, 'Convenio entre dependencias o con estados'],
  [/REGLAS DE OPERACION DEL PROGRAMA/, 'Reglas de operación de un programa social'],
]

/** Motivo de descarte, o null si la publicación se categoriza con IA. */
export function noiseReason(title: string): string | null {
  const t = norm(title)
  return NOISE.find(([re]) => re.test(t))?.[1] ?? null
}
