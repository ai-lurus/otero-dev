'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setMyTenantUserPermissions } from '@/app/actions/tenant-users'
import { Button } from '@/components/ui/button'
import {
  ACTION_LABELS, PERMISSION_ACTIONS, SCREEN_KEYS, SCREENS,
  type PermissionAction, type PermissionMap, type Screen,
} from '@/lib/client-permissions'

// Matriz de pantallas por acciones (ver, crear, editar, borrar). Ver va implícito en las demás.
function toggle(map: PermissionMap, screen: Screen, action: PermissionAction, on: boolean): PermissionMap {
  const current = new Set(map[screen] ?? [])
  if (on) {
    current.add(action)
    current.add('view')
  } else if (action === 'view') {
    current.clear()
  } else {
    current.delete(action)
  }
  const next = PERMISSION_ACTIONS.filter(a => current.has(a))
  return { ...map, [screen]: next }
}

export function PermissionsEditor({ userId, userName, initial, custom, onClose }: {
  userId: string
  userName: string
  initial: PermissionMap
  custom: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [map, setMap] = useState<PermissionMap>(initial)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function save() {
    setError('')
    startTransition(async () => {
      try {
        await setMyTenantUserPermissions(userId, map)
        router.refresh()
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron guardar los permisos')
      }
    })
  }

  return (
    <div className="mt-3 w-full rounded-lg border border-border bg-surface-sunken p-4">
      <p className="text-body-sm text-ink">
        Permisos de <span className="font-medium">{userName}</span>
      </p>
      <p className="mt-1 text-caption text-ink-muted">
        {custom ? 'Permisos personalizados.' : 'Todavía no los personalizas: se muestran los que tiene por defecto.'}{' '}
        Usuarios y Bitácora son siempre del administrador.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left">
          <thead>
            <tr className="text-label text-ink-muted">
              <th scope="col" className="py-2 pr-3 font-medium">Pantalla</th>
              {PERMISSION_ACTIONS.map(a => <th key={a} scope="col" className="px-3 py-2 text-center font-medium">{ACTION_LABELS[a]}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {SCREEN_KEYS.map(screen => (
              <tr key={screen}>
                <th scope="row" className="py-2 pr-3 text-body-sm font-normal text-ink">{SCREENS[screen].label}</th>
                {PERMISSION_ACTIONS.map(action => (
                  <td key={action} className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={map[screen]?.includes(action) ?? false}
                      onChange={e => setMap(toggle(map, screen, action, e.target.checked))}
                      aria-label={`${ACTION_LABELS[action]} en ${SCREENS[screen].label}`}
                      className="size-4 accent-ink"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p role="alert" className="mt-3 rounded-md border border-risk bg-risk-tint px-3 py-2 text-body-sm text-risk">{error}</p>}
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={save} disabled={isPending}>{isPending ? 'Guardando…' : 'Guardar permisos'}</Button>
        <Button size="sm" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button>
      </div>
    </div>
  )
}
