'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createMyTenantUser,
  updateMyTenantUser,
  removeMyTenantUser,
  resetMyTenantUserPassword,
} from '@/app/actions/tenant-users'

type Row = { id: string; name: string; email: string; role: string }
type Role = 'client' | 'tenant_admin'

const inputCls = 'rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20'
const labelCls = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

export default function UsuariosClient({ users, meId }: { users: Row[]; meId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('client')

  function run(fn: () => Promise<void>, after?: () => void) {
    setError('')
    startTransition(async () => {
      try {
        await fn()
        after?.()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error')
      }
    })
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    run(() => createMyTenantUser({ name, email, password, role }), () => {
      setShowForm(false); setName(''); setEmail(''); setPassword(''); setRole('client')
    })
  }

  function handleReset(u: Row) {
    const pw = prompt(`Nueva contraseña para ${u.name} (mínimo 8 caracteres):`)
    if (pw) run(() => resetMyTenantUserPassword(u.id, pw))
  }

  function handleRemove(u: Row) {
    if (!confirm(`¿Quitar el acceso de ${u.name}?`)) return
    run(() => removeMyTenantUser(u.id))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)}
          className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity">
          {showForm ? 'Cerrar' : 'Nuevo usuario'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Nombre completo *</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Correo electrónico *</label>
              <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Contraseña inicial *</label>
              <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Mín. 8 caracteres" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Rol *</label>
              <select className={inputCls} value={role} onChange={e => setRole(e.target.value as Role)}>
                <option value="client">Usuario</option>
                <option value="tenant_admin">Administrador</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={isPending}
            className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 transition-opacity">
            {isPending ? 'Creando…' : 'Crear usuario'}
          </button>
        </form>
      )}

      {error && <p className="text-xs text-risk bg-risk-tint border border-risk/30 rounded-lg px-4 py-2">{error}</p>}

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {users.map(u => {
          const isMe = u.id === meId
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="flex-1 min-w-[180px]">
                <p className="text-sm font-semibold text-foreground">{u.name}{isMe && <span className="ml-2 text-[10px] text-muted-foreground">(tú)</span>}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <select value={u.role} disabled={isMe || isPending}
                onChange={e => run(() => updateMyTenantUser(u.id, { role: e.target.value as Role }))}
                className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold">
                <option value="client">Usuario</option>
                <option value="tenant_admin">Administrador</option>
              </select>
              <button onClick={() => handleReset(u)} disabled={isPending}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Restablecer contraseña</button>
              {!isMe && (
                <button onClick={() => handleRemove(u)} disabled={isPending}
                  className="text-xs font-medium text-risk hover:text-risk transition-colors">Quitar</button>
              )}
            </div>
          )
        })}
        {!users.length && <p className="px-5 py-6 text-sm text-muted-foreground">Aún no hay usuarios.</p>}
      </div>
    </div>
  )
}
