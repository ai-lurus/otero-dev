import type { Materia } from '@/lib/ingest/categories'

// Perfil de monitoreo de un cliente: lo mínimo para saber qué publicaciones le
// tocan. Actividad SCIAN, estados donde opera, unas preguntas que activan
// materias y las materias que el despacho le vigila. Lo llena el despacho al
// dar de alta al cliente y el admin del cliente lo confirma o corrige.

/** Sectores SCIAN. La manufactura (31-33) se guarda como "31". */
export const SCIAN_SECTORS = [
  { code: '11', label: 'Agricultura, ganadería, aprovechamiento forestal y pesca' },
  { code: '21', label: 'Minería y extracción de petróleo y gas' },
  { code: '22', label: 'Energía eléctrica, agua y gas por ductos' },
  { code: '23', label: 'Construcción' },
  { code: '31', label: 'Industrias manufactureras' },
  { code: '43', label: 'Comercio al por mayor' },
  { code: '46', label: 'Comercio al por menor' },
  { code: '48', label: 'Transportes, correos y almacenamiento' },
  { code: '51', label: 'Información en medios masivos' },
  { code: '52', label: 'Servicios financieros y de seguros' },
  { code: '53', label: 'Servicios inmobiliarios y de alquiler' },
  { code: '54', label: 'Servicios profesionales, científicos y técnicos' },
  { code: '55', label: 'Corporativos' },
  { code: '56', label: 'Apoyo a los negocios, manejo de residuos y remediación' },
  { code: '61', label: 'Servicios educativos' },
  { code: '62', label: 'Servicios de salud y de asistencia social' },
  { code: '71', label: 'Esparcimiento, cultura y deporte' },
  { code: '72', label: 'Alojamiento y preparación de alimentos y bebidas' },
  { code: '81', label: 'Otros servicios' },
] as const

/** Subsectores SCIAN más usados para decidir materias. Opcionales. */
export const SCIAN_SUBSECTORS: { code: string; sector: string; label: string }[] = [
  { code: '211', sector: '21', label: 'Extracción de petróleo y gas' },
  { code: '212', sector: '21', label: 'Minería de minerales metálicos y no metálicos' },
  { code: '213', sector: '21', label: 'Servicios relacionados con la minería' },
  { code: '221', sector: '22', label: 'Energía eléctrica' },
  { code: '222', sector: '22', label: 'Agua y gas por ductos al consumidor final' },
  { code: '236', sector: '23', label: 'Edificación' },
  { code: '237', sector: '23', label: 'Obras de ingeniería civil' },
  { code: '238', sector: '23', label: 'Trabajos especializados para la construcción' },
  { code: '311', sector: '31', label: 'Industria alimentaria' },
  { code: '312', sector: '31', label: 'Industria de las bebidas y del tabaco' },
  { code: '313', sector: '31', label: 'Insumos textiles y acabado de textiles' },
  { code: '315', sector: '31', label: 'Prendas de vestir' },
  { code: '316', sector: '31', label: 'Cuero, piel y sus productos' },
  { code: '321', sector: '31', label: 'Industria de la madera' },
  { code: '322', sector: '31', label: 'Industria del papel' },
  { code: '323', sector: '31', label: 'Impresión e industrias conexas' },
  { code: '324', sector: '31', label: 'Derivados del petróleo y del carbón' },
  { code: '325', sector: '31', label: 'Industria química (incluye farmacéutica)' },
  { code: '326', sector: '31', label: 'Industria del plástico y del hule' },
  { code: '327', sector: '31', label: 'Productos a base de minerales no metálicos' },
  { code: '331', sector: '31', label: 'Industrias metálicas básicas' },
  { code: '332', sector: '31', label: 'Productos metálicos' },
  { code: '333', sector: '31', label: 'Maquinaria y equipo' },
  { code: '334', sector: '31', label: 'Equipo de computación, comunicación y electrónica' },
  { code: '335', sector: '31', label: 'Aparatos eléctricos y equipo de generación eléctrica' },
  { code: '336', sector: '31', label: 'Equipo de transporte' },
  { code: '337', sector: '31', label: 'Muebles, colchones y persianas' },
  { code: '339', sector: '31', label: 'Otras industrias manufactureras' },
  { code: '468', sector: '46', label: 'Vehículos, refacciones, combustibles y lubricantes' },
  { code: '484', sector: '48', label: 'Autotransporte de carga' },
  { code: '486', sector: '48', label: 'Transporte por ductos' },
  { code: '493', sector: '48', label: 'Almacenamiento' },
  { code: '562', sector: '56', label: 'Manejo de residuos y remediación' },
  { code: '621', sector: '62', label: 'Servicios médicos de consulta externa' },
  { code: '622', sector: '62', label: 'Hospitales' },
  { code: '721', sector: '72', label: 'Alojamiento temporal (hoteles)' },
  { code: '722', sector: '72', label: 'Preparación de alimentos y bebidas (restaurantes)' },
]

export const sectorOf = (code: string | null | undefined) =>
  !code ? null : code.length === 2 ? code : SCIAN_SUBSECTORS.find(s => s.code === code)?.sector ?? code.slice(0, 2)

export function scianLabel(code: string | null | undefined) {
  if (!code) return null
  const sub = SCIAN_SUBSECTORS.find(s => s.code === code)
  if (sub) return `${sub.code} ${sub.label}`
  const sector = SCIAN_SECTORS.find(s => s.code === code)
  return sector ? sector.label : code
}

export const ESTADOS = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
  'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
  'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
  'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
] as const

export const EMPLOYEE_RANGES = ['1 a 10', '11 a 50', '51 a 250', '251 a 1,000', 'Más de 1,000'] as const

type Option = { value: string; label: string }
const YES_NO: Option[] = [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }]

/** Preguntas que activan materias. Las opciones salen del catálogo ambiental y del doc de monitoreo. */
export const TRIGGERS = [
  { key: 'comercio_exterior', label: '¿Importa o exporta mercancías?', options: YES_NO },
  { key: 'immex', label: '¿Tiene programa IMMEX?', options: YES_NO },
  { key: 'hidrocarburos', label: '¿Almacena, vende o transporta combustibles, gas o hidrocarburos?', hint: 'Si es así, en ambiental la autoridad es la ASEA.', options: YES_NO },
  {
    key: 'residuos_peligrosos', label: '¿Genera residuos peligrosos?', hint: 'Define la categoría de generador.',
    options: [
      { value: 'no', label: 'No' },
      { value: 'micro', label: 'Hasta 400 kg al año' },
      { value: 'pequeno', label: 'De 400 kg a 10 t al año' },
      { value: 'gran', label: 'Más de 10 t al año' },
    ],
  },
  { key: 'emisiones', label: '¿Tiene calderas, hornos, chimeneas u otras fuentes de emisiones?', options: YES_NO },
  { key: 'agua_concesion', label: '¿Tiene concesión de aguas nacionales (pozo o toma)?', options: YES_NO },
  {
    key: 'agua_descarga', label: '¿Descarga aguas residuales?',
    options: [
      { value: 'no', label: 'No' },
      { value: 'drenaje', label: 'Al drenaje municipal' },
      { value: 'cuerpo_nacional', label: 'A río, mar u otro cuerpo nacional' },
    ],
  },
  { key: 'costero', label: '¿Tiene inmuebles en costa o en zona federal marítimo terrestre?', options: YES_NO },
  { key: 'sanitario', label: '¿Fabrica, importa o vende alimentos, bebidas, fármacos, cosméticos o dispositivos médicos?', hint: 'Regulado por COFEPRIS.', options: YES_NO },
  { key: 'pld', label: '¿Realiza actividades vulnerables de prevención de lavado de dinero?', hint: 'Inmuebles, vehículos, joyas, préstamos, blindaje, entre otras.', options: YES_NO },
] as const satisfies readonly { key: string; label: string; hint?: string; options: Option[] }[]

export type TriggerKey = (typeof TRIGGERS)[number]['key']
export type Triggers = Partial<Record<TriggerKey, string>>

/** Materias que el despacho puede vigilarle a un cliente (las de la ingesta, sin "otra"). */
export type MonitoredMateria = Exclude<Materia, 'otra'>

export type MonitoringFields = {
  scian?: string | null
  stateList?: string[] | null
  triggers?: Triggers | null
  employees?: string | null
  materias?: string[] | null
  confirmedAt?: Date | string | null
}

export type ProfileStatus = 'vacio' | 'incompleto' | 'completo'

/** Completo: actividad, al menos un estado y todas las preguntas contestadas. */
export function profileStatus(p: MonitoringFields | null | undefined): ProfileStatus {
  if (!p) return 'vacio'
  const answered = TRIGGERS.filter(t => p.triggers?.[t.key]).length
  const hasStates = Boolean(p.stateList?.length)
  if (!p.scian && !hasStates && answered === 0) return 'vacio'
  return p.scian && hasStates && answered === TRIGGERS.length ? 'completo' : 'incompleto'
}

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  vacio: 'Sin perfil',
  incompleto: 'Perfil incompleto',
  completo: 'Perfil completo',
}

/** Limpia lo que llega del formulario: solo valores conocidos. */
export function sanitizeMonitoring(input: MonitoringFields, materiaKeys: readonly string[]) {
  const scian = input.scian && (SCIAN_SECTORS.some(s => s.code === input.scian) || SCIAN_SUBSECTORS.some(s => s.code === input.scian)) ? input.scian : null
  const stateList = [...new Set((input.stateList ?? []).filter(s => (ESTADOS as readonly string[]).includes(s)))]
  const triggers: Triggers = {}
  for (const t of TRIGGERS) {
    const value = input.triggers?.[t.key]
    if (value && t.options.some(o => o.value === value)) triggers[t.key] = value
  }
  const employees = input.employees && (EMPLOYEE_RANGES as readonly string[]).includes(input.employees) ? input.employees : null
  const materias = input.materias ? [...new Set(input.materias.filter(m => materiaKeys.includes(m) && m !== 'otra'))] : null
  return { scian, stateList, triggers, employees, materias }
}
