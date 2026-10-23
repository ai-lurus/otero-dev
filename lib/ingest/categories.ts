export const MATERIAS = {
  fiscal: 'Fiscal',
  laboral: 'Laboral y seguridad social',
  datos_personales: 'Datos personales',
  ambiental: 'Ambiental',
  seguridad_higiene: 'Seguridad e higiene (NOM)',
  corporativo: 'Corporativo y mercantil',
  anticorrupcion_pld: 'Anticorrupción y prevención de lavado (PLD)',
  comercio_exterior: 'Comercio exterior y aduanas',
  financiero: 'Financiero y bursátil',
  energia: 'Energía',
  salud: 'Salud y sanitario',
  propiedad_intelectual: 'Propiedad intelectual',
  competencia: 'Competencia económica',
  otra: 'Otra',
} as const

export type Materia = keyof typeof MATERIAS
export const MATERIA_KEYS = Object.keys(MATERIAS) as Materia[]

export const VIGENCIAS = {
  vigente: 'Vigente',
  proyecto: 'Proyecto / iniciativa',
  derogada: 'Derogada o abrogada',
  no_aplica: 'No aplica',
  desconocida: 'No determinada',
} as const

export type Vigencia = keyof typeof VIGENCIAS
export const VIGENCIA_KEYS = Object.keys(VIGENCIAS) as Vigencia[]
