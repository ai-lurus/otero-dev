// Diccionario de acciones de la bitácora del sistema. Es la única lista de tipos
// válidos: `logAction` solo acepta llaves de aquí y la pantalla las traduce con
// `ACTION_DICTIONARY`. Archivo puro (sin base de datos) para poder probarlo.

export const AUDIT_CATEGORIES = {
  asunto: 'Asuntos',
  cumplimiento: 'Cumplimiento',
  documento: 'Documentos',
  certificacion: 'Certificaciones',
  empresa: 'Empresa',
  usuario: 'Usuarios y permisos',
} as const

/** Filas por página en la pantalla de bitácora. */
export const AUDIT_PAGE_SIZE = 50

export type AuditCategory = keyof typeof AUDIT_CATEGORIES

export const ACTION_DICTIONARY = {
  // Asuntos de RegWatch
  'asunto.estado_cambiado': { category: 'asunto', label: 'Cambió el estado de un asunto' },
  'asunto.aceptado_asignado': { category: 'asunto', label: 'Aceptó y asignó un asunto' },
  'asunto.evidencia_agregada': { category: 'asunto', label: 'Agregó evidencia a un asunto' },
  'asunto.archivo_descargado': { category: 'asunto', label: 'Descargó un archivo de un asunto' },
  'asunto.archivo_cargado': { category: 'asunto', label: 'Cargó un archivo a un asunto' },
  // Tablero Mi cumplimiento
  'cumplimiento.etapa_movida': { category: 'cumplimiento', label: 'Movió un asunto de etapa' },
  'cumplimiento.reasignado': { category: 'cumplimiento', label: 'Reasignó un asunto' },
  // Tareas de un asunto
  'tarea.creada': { category: 'cumplimiento', label: 'Creó una tarea en un asunto' },
  'tarea.editada': { category: 'cumplimiento', label: 'Editó una tarea' },
  'tarea.reasignada': { category: 'cumplimiento', label: 'Reasignó una tarea' },
  'tarea.estatus_cambiado': { category: 'cumplimiento', label: 'Cambió el estatus de una tarea' },
  'tarea.eliminada': { category: 'cumplimiento', label: 'Eliminó una tarea' },
  // Documentos
  'documento.creado': { category: 'documento', label: 'Subió un documento' },
  'documento.confirmado': { category: 'documento', label: 'Confirmó el análisis de un documento' },
  'documento.firmado': { category: 'documento', label: 'Marcó un documento como firmado' },
  'documento.eliminado': { category: 'documento', label: 'Eliminó un documento' },
  'documento.descargado': { category: 'documento', label: 'Descargó un documento' },
  // Certificaciones
  'certificacion.creada': { category: 'certificacion', label: 'Creó una certificación' },
  'certificacion.editada': { category: 'certificacion', label: 'Editó una certificación' },
  // Empresa
  'empresa.perfil_guardado': { category: 'empresa', label: 'Guardó el perfil de la empresa' },
  'empresa.pago_marcado': { category: 'empresa', label: 'Marcó un pago como pagado' },
  'empresa.cita_creada': { category: 'empresa', label: 'Creó una cita en la agenda' },
  // Usuarios y permisos
  'usuario.creado': { category: 'usuario', label: 'Creó un usuario' },
  'usuario.editado': { category: 'usuario', label: 'Editó un usuario' },
  'usuario.eliminado': { category: 'usuario', label: 'Eliminó un usuario' },
  'usuario.clave_restablecida': { category: 'usuario', label: 'Restableció la contraseña de un usuario' },
  'usuario.permisos_cambiados': { category: 'usuario', label: 'Cambió los permisos de un usuario' },
} as const satisfies Record<string, { category: AuditCategory; label: string }>

export type AuditAction = keyof typeof ACTION_DICTIONARY

export const isAuditAction = (value: string): value is AuditAction =>
  Object.prototype.hasOwnProperty.call(ACTION_DICTIONARY, value)

export const actionLabel = (action: string): string =>
  isAuditAction(action) ? ACTION_DICTIONARY[action].label : action

export const actionCategory = (action: string): AuditCategory | null =>
  isAuditAction(action) ? ACTION_DICTIONARY[action].category : null

export const actionsOfCategory = (category: AuditCategory): AuditAction[] =>
  (Object.keys(ACTION_DICTIONARY) as AuditAction[]).filter((key) => ACTION_DICTIONARY[key].category === category)
