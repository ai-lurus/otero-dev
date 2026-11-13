'use server'

import { getAccess } from '@/lib/access'
import { can, visibleScreens, type PermissionAction, type Screen } from '@/lib/client-permissions'

// Lo que el portal necesita saber de quien lo usa para armar menú y botones.
// El menú es una comodidad: cada página y acción se valida también en el servidor.

export async function getMyAccess() {
  const access = await getAccess()
  if (!access) return { isDirector: false, screens: [] as Screen[] }
  return { isDirector: access.isDirector, screens: visibleScreens(access) }
}

/** Qué acciones puede hacer la persona en una pantalla, para mostrar u ocultar botones. */
export async function getMyScreenPermissions(screen: Screen): Promise<Record<PermissionAction, boolean>> {
  const access = await getAccess()
  const allowed = (action: PermissionAction) => (access ? can(access, screen, action) : false)
  return { view: allowed('view'), create: allowed('create'), edit: allowed('edit'), delete: allowed('delete') }
}
