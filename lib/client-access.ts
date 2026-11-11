// Quién ve qué dentro del portal del cliente. Dos roles de la empresa:
// el director (tenant_admin) decide y administra; el miembro (client) ejecuta
// lo que se le asignó. Este archivo es puro (sin base de datos) para poder probarlo.

export type ClientRole = 'director' | 'member'

/** Estados con los que un asunto ya está en el tablero de cumplimiento. */
export const BOARD_STATUSES = ['aceptada', 'cerrada'] as const

type Viewer = { isDirector: boolean; memberId: string | null }
type ItemScope = { assigneeId: string | null; status: string }

/** El director ve todo lo enviado a su empresa; el miembro solo lo que ya aceptaron y le asignaron a él. */
export function canSeeItem(viewer: Viewer, item: ItemScope): boolean {
  if (viewer.isDirector) return true
  return viewer.memberId !== null
    && item.assigneeId === viewer.memberId
    && (BOARD_STATUSES as readonly string[]).includes(item.status)
}
