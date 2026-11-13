// Permisos de las personas de la empresa cliente, por pantalla y por acción (CRUD).
// El director (tenant_admin) lo puede todo y es quien edita los permisos del equipo.
// Archivo puro (sin base de datos) para poder probarlo.

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Borrar',
}

/** Pantallas del portal cuyo acceso el director puede repartir. Usuarios y Bitácora son siempre del director. */
export const SCREENS = {
  regwatch: { label: 'RegWatch', href: '/cliente/obligaciones' },
  cumplimiento: { label: 'Mi cumplimiento', href: '/cliente/cumplimiento' },
  certificaciones: { label: 'Certificaciones', href: '/cliente/certificaciones' },
  documentos: { label: 'Documentos', href: '/cliente/documentos' },
  noticias: { label: 'Noticias', href: '/cliente/noticias' },
  perfil: { label: 'Perfil de la empresa', href: '/cliente/perfil' },
  servicios: { label: 'Servicios', href: '/cliente/servicios' },
  pagos: { label: 'Pagos', href: '/cliente/pagos' },
  agenda: { label: 'Agenda', href: '/cliente/agenda' },
} as const

export type Screen = keyof typeof SCREENS
export const SCREEN_KEYS = Object.keys(SCREENS) as Screen[]

export type PermissionMap = Partial<Record<Screen, PermissionAction[]>>

export const isScreen = (value: string): value is Screen => Object.prototype.hasOwnProperty.call(SCREENS, value)
export const isPermissionAction = (value: string): value is PermissionAction =>
  (PERMISSION_ACTIONS as readonly string[]).includes(value)

/** Lo que el miembro del equipo puede hacer mientras el director no cambie nada. Replica el comportamiento previo. */
export const DEFAULT_MEMBER_PERMISSIONS: PermissionMap = {
  cumplimiento: ['view', 'create', 'edit'],
  documentos: ['view', 'create'],
  noticias: ['view'],
  perfil: ['view'],
}

/** Dejar editar o borrar sin poder ver no tiene sentido: ver va implícito en las demás acciones. */
export function sanitizePermissions(input: unknown): PermissionMap {
  const result: PermissionMap = {}
  if (!input || typeof input !== 'object') return result
  for (const [screen, actions] of Object.entries(input as Record<string, unknown>)) {
    if (!isScreen(screen) || !Array.isArray(actions)) continue
    const valid = PERMISSION_ACTIONS.filter((action) => actions.includes(action))
    if (valid.length === 0) continue
    result[screen] = valid.includes('view') ? valid : ['view', ...valid]
  }
  return result
}

type Subject = { isDirector: boolean; permissions: PermissionMap | null }

/** `permissions` nulo significa que el director nunca los personalizó: aplican los de fábrica. */
export function can(subject: Subject, screen: Screen, action: PermissionAction): boolean {
  if (subject.isDirector) return true
  const map = subject.permissions ?? DEFAULT_MEMBER_PERMISSIONS
  return map[screen]?.includes(action) ?? false
}

/** Pantallas que esta persona puede abrir. */
export function visibleScreens(subject: Subject): Screen[] {
  return SCREEN_KEYS.filter((screen) => can(subject, screen, 'view'))
}

/** Pantalla a la que va quien abre una ruta que no le toca: la primera que sí puede ver, o el inicio. */
export function fallbackHref(subject: Subject): string {
  const first = visibleScreens(subject)[0]
  return first ? SCREENS[first].href : '/cliente'
}

/** Diferencia legible entre dos configuraciones, para la bitácora. */
export function describePermissionChange(before: PermissionMap, after: PermissionMap): string[] {
  const lines: string[] = []
  for (const screen of SCREEN_KEYS) {
    const was = before[screen] ?? []
    const now = after[screen] ?? []
    const added = now.filter((a) => !was.includes(a))
    const removed = was.filter((a) => !now.includes(a))
    if (added.length) lines.push(`${SCREENS[screen].label}: +${added.map((a) => ACTION_LABELS[a]).join(', ')}`)
    if (removed.length) lines.push(`${SCREENS[screen].label}: −${removed.map((a) => ACTION_LABELS[a]).join(', ')}`)
  }
  return lines
}
