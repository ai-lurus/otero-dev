import type { Materia } from '@/lib/ingest/categories'

// Salas de prensa del despacho (Excel "URL publicaciones y comunicados
// dependencias"). En gob.mx el enlace del Excel apunta a la portada; el
// listado de comunicados vive en /<dependencia>/archivo/prensa con las notas
// en /<dependencia>/prensa/…, que es lo que se lee aquí.
// Las fuentes normativas del mismo Excel (DOF, PIGR, gacetas) van por RegWatch.

export type CatalogSource = {
  id: string
  name: string
  shortName: string
  url: string
  linkFilter: string | null
  kind: 'dependencia' | 'institucion'
  parent: string | null
  materia: Materia
  /** false: se registra pero no se lee (su robots.txt lo prohíbe). */
  active?: boolean
}

type GobMx = [id: string, name: string, shortName: string, materia: Materia, parent?: string]

const gobMx = (kind: CatalogSource['kind']) => ([id, name, shortName, materia, parent]: GobMx): CatalogSource => ({
  id,
  name,
  shortName,
  url: `https://www.gob.mx/${id}/archivo/prensa`,
  linkFilter: `*/${id}/prensa/*`,
  kind,
  parent: parent ?? null,
  materia,
})

const DEPENDENCIAS: GobMx[] = [
  ['presidencia', 'Presidencia de la República', 'Presidencia', 'otra'],
  ['agricultura', 'Agricultura', 'Agricultura', 'otra'],
  ['bienestar', 'Bienestar', 'Bienestar', 'otra'],
  ['buengobierno', 'Anticorrupción y Buen Gobierno', 'Buen Gobierno', 'anticorrupcion_pld'],
  ['sict', 'Infraestructura, Comunicaciones y Transportes', 'SICT', 'otra'],
  ['cjef', 'Consejería Jurídica del Ejecutivo Federal', 'CJEF', 'otra'],
  ['defensa', 'Defensa', 'Defensa', 'otra'],
  ['sedatu', 'Desarrollo Agrario, Territorial y Urbano', 'SEDATU', 'otra'],
  ['se', 'Economía', 'Economía', 'comercio_exterior'],
  ['sep', 'Educación Pública', 'SEP', 'otra'],
  ['sener', 'Energía', 'SENER', 'energia'],
  ['segob', 'Gobernación', 'SEGOB', 'otra'],
  ['shcp', 'Hacienda y Crédito Público', 'SHCP', 'fiscal'],
  ['semar', 'Marina', 'SEMAR', 'otra'],
  ['semarnat', 'Medio Ambiente y Recursos Naturales', 'SEMARNAT', 'ambiental'],
  ['sre', 'Relaciones Exteriores', 'SRE', 'otra'],
  ['salud', 'Salud', 'Salud', 'salud'],
  ['sspc', 'Seguridad y Protección Ciudadana', 'SSPC', 'otra'],
  ['stps', 'Trabajo y Previsión Social', 'STPS', 'laboral'],
  ['sectur', 'Turismo', 'SECTUR', 'otra'],
]

const INSTITUCIONES: GobMx[] = [
  ['cofepris', 'Comisión Federal para la Protección contra Riesgos Sanitarios', 'COFEPRIS', 'salud', 'Salud'],
  ['conanp', 'Comisión Nacional de Áreas Naturales Protegidas', 'CONANP', 'ambiental', 'Medio Ambiente'],
  ['cne', 'Comisión Nacional de Energía', 'CNE', 'energia', 'Energía'],
  ['guardianacional', 'Guardia Nacional', 'Guardia Nacional', 'otra', 'Defensa'],
  ['asea', 'Agencia de Seguridad, Energía y Ambiente', 'ASEA', 'ambiental', 'Medio Ambiente'],
  ['profeco', 'Procuraduría Federal del Consumidor', 'PROFECO', 'otra', 'Economía'],
  ['profepa', 'Procuraduría Federal de Protección al Ambiente', 'PROFEPA', 'ambiental', 'Medio Ambiente'],
  ['sat', 'Servicio de Administración Tributaria', 'SAT', 'fiscal', 'Hacienda y Crédito Público'],
  ['senasica', 'Servicio Nacional de Sanidad, Inocuidad y Calidad Agroalimentaria', 'SENASICA', 'salud', 'Agricultura'],
  ['conagua', 'Comisión Nacional del Agua', 'CONAGUA', 'ambiental', 'Autónoma'],
  ['ran', 'Registro Agrario Nacional', 'RAN', 'otra', 'Desarrollo Territorial'],
]

export const NEWS_CATALOG: CatalogSource[] = [
  ...DEPENDENCIAS.map(gobMx('dependencia')),
  {
    id: 'atdt', name: 'Agencia de Transformación Digital y Telecomunicaciones', shortName: 'ATDT',
    url: 'https://www.gob.mx/atdt/comunicacion', linkFilter: '*/atdt/comunicacion/*',
    kind: 'dependencia', parent: null, materia: 'otra',
  },
  {
    id: 'secihti', name: 'Ciencia, Humanidades, Tecnología e Innovación', shortName: 'SECIHTI',
    url: 'https://secihti.mx/sala-de-prensa/', linkFilter: '*secihti.mx/sala-de-prensa/*',
    kind: 'dependencia', parent: null, materia: 'otra',
  },
  ...INSTITUCIONES.map(gobMx('institucion')),
  {
    // Su certificado no se puede verificar desde los servidores: pausada hasta que lo corrijan.
    id: 'cfe', name: 'Comisión Federal de Electricidad', shortName: 'CFE',
    url: 'https://app.cfe.mx/Aplicaciones/OTROS/Boletines/Prensa?c=1', linkFilter: '*boletin.aspx?i=*',
    kind: 'institucion', parent: 'Empresa Pública del Estado', materia: 'energia', active: false,
  },
  {
    // Su robots.txt solo deja leer a Google: queda registrada pero pausada.
    id: 'pemex', name: 'Petróleos Mexicanos', shortName: 'PEMEX',
    url: 'https://www.pemex.com/saladeprensa/boletines_nacionales/Paginas/default.aspx', linkFilter: '*/boletines_nacionales/Paginas/20*',
    kind: 'institucion', parent: 'Empresa Pública del Estado', materia: 'energia', active: false,
  },
]
