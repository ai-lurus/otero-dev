'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, updateUser, updateUserRole, removeUserFromTenant, deleteUser, resetUserPassword } from '@/app/actions/admin'
import type { Tenant } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

type UserWithMemberships = {
  id: string
  name: string
  email: string
  createdAt: Date
  memberships: {
    id: string
    userId: string
    tenantId: string
    role: string
    createdAt: Date
    tenant?: Tenant
  }[]
}

interface Props {
  tenants: Tenant[]
  users: UserWithMemberships[]
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin:      'Administrador',
  tenant_admin: 'Admin del cliente',
  client:     'Cliente',
}
const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-ink text-surface',
  admin:      'bg-surface-sunken text-ink',
  tenant_admin: 'bg-ok-tint text-ok',
  client:     'bg-secondary text-muted-foreground',
}

export default function UserManager({ tenants, users }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [tenantFilter, setTenantFilter] = useState<string>('all')

  // Edit user modal
  const [editUser, setEditUser] = useState<UserWithMemberships | null>(null)
  const [eName, setEName]       = useState('')
  const [eEmail, setEEmail]     = useState('')
  const [eError, setEError]     = useState('')

  function openEdit(u: UserWithMemberships) {
    setEditUser(u); setEName(u.name); setEEmail(u.email); setEError('')
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setEError('')
    startTransition(async () => {
      try {
        await updateUser(editUser.id, { name: eName, email: eEmail })
        setEditUser(null)
        router.refresh()
      } catch (err: unknown) {
        setEError(err instanceof Error ? err.message : 'Error al guardar')
      }
    })
  }

  // Form state
  const [fName,     setFName]     = useState('')
  const [fEmail,    setFEmail]    = useState('')
  const [fPassword, setFPassword] = useState('')
  const [fTenant,   setFTenant]   = useState(tenants[0]?.id ?? '')
  const [fRole,     setFRole]     = useState<'admin' | 'tenant_admin' | 'client'>('client')
  const [fError,    setFError]    = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFError('')
    startTransition(async () => {
      try {
        await createUser({ name: fName.trim(), email: fEmail.trim(), password: fPassword, tenantId: fTenant, role: fRole })
        setShowForm(false)
        setFName(''); setFEmail(''); setFPassword('')
        router.refresh()
      } catch (err: unknown) {
        setFError(err instanceof Error ? err.message : 'Error al crear usuario')
      }
    })
  }

  async function handleRoleChange(userId: string, tenantId: string, role: string) {
    await updateUserRole(userId, tenantId, role)
    router.refresh()
  }

  async function handleRemove(userId: string, tenantId: string) {
    if (!confirm('¿Quitar a este usuario de la empresa?')) return
    await removeUserFromTenant(userId, tenantId)
    router.refresh()
  }

  const [query, setQuery] = useState('')
  const [actionError, setActionError] = useState('')

  // Reset password modal
  const [pwUser, setPwUser]   = useState<UserWithMemberships | null>(null)
  const [pwValue, setPwValue] = useState('')
  const [pwError, setPwError] = useState('')

  function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwUser) return
    setPwError('')
    startTransition(async () => {
      try {
        await resetUserPassword(pwUser.id, pwValue)
        setPwUser(null); setPwValue('')
      } catch (err: unknown) {
        setPwError(err instanceof Error ? err.message : 'Error al restablecer')
      }
    })
  }

  function handleDelete(u: UserWithMemberships) {
    if (!confirm(`¿Eliminar definitivamente a ${u.name}? Esta acción no se puede deshacer.`)) return
    setActionError('')
    startTransition(async () => {
      try {
        await deleteUser(u.id)
        router.refresh()
      } catch (err: unknown) {
        setActionError(err instanceof Error ? err.message : 'No se pudo eliminar')
      }
    })
  }

  const q = query.trim().toLowerCase()
  const filteredUsers = users
    .filter(u => tenantFilter === 'all' || u.memberships.some(m => m.tenantId === tenantFilter))
    .filter(u => !q || u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))

  return (
    <div className="space-y-6">

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setEditUser(null)}>
          <form
            onSubmit={handleEditSave}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6  space-y-4"
          >
            <h2 className="text-sm font-semibold text-foreground">Editar usuario</h2>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre completo</label>
              <input
                type="text" value={eName} onChange={e => setEName(e.target.value)} required
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correo electrónico</label>
              <input
                type="email" value={eEmail} onChange={e => setEEmail(e.target.value)} required
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            {eError && <p className="text-xs text-risk bg-risk-tint border border-risk/30 rounded-lg px-4 py-2">{eError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={isPending}
                className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 transition-opacity flex-1">
                {isPending ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" onClick={() => setEditUser(null)}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      {pwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setPwUser(null)}>
          <form
            onSubmit={handleResetPassword}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6  space-y-4"
          >
            <div>
              <h2 className="text-sm font-semibold text-foreground">Restablecer contraseña</h2>
              <p className="mt-1 text-xs text-muted-foreground">{pwUser.email}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nueva contraseña</label>
              <input
                type="password" value={pwValue} onChange={e => setPwValue(e.target.value)} required minLength={8}
                placeholder="Mín. 8 caracteres"
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            {pwError && <p className="text-xs text-risk bg-risk-tint border border-risk/30 rounded-lg px-4 py-2">{pwError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={isPending}
                className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 transition-opacity flex-1">
                {isPending ? 'Guardando...' : 'Restablecer'}
              </button>
              <button type="button" onClick={() => setPwUser(null)}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {actionError && <p className="text-xs text-risk bg-risk-tint border border-risk/30 rounded-lg px-4 py-2">{actionError}</p>}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar usuarios"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</label>
          <select
            value={tenantFilter}
            onChange={e => setTenantFilter(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          >
            <option value="all">Todas las empresas</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nuevo usuario
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-border bg-card p-6  space-y-5"
        >
          <h2 className="text-sm font-semibold text-foreground">Crear nuevo usuario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre completo *</label>
              <input type="text" value={fName} onChange={e => setFName(e.target.value)} required placeholder="Ana García"
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correo electrónico *</label>
              <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} required placeholder="usuario@empresa.com"
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contraseña inicial *</label>
              <input type="password" value={fPassword} onChange={e => setFPassword(e.target.value)} required minLength={8} placeholder="Min. 8 caracteres"
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresa *</label>
              <select value={fTenant} onChange={e => setFTenant(e.target.value)}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rol *</label>
              <select value={fRole} onChange={e => setFRole(e.target.value as 'admin' | 'tenant_admin' | 'client')}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
                <option value="client">Cliente</option>
                <option value="tenant_admin">Admin del cliente</option>
                <option value="admin">Administrador de Otero</option>
              </select>
            </div>
          </div>
          {fError && <p className="text-xs text-risk bg-risk-tint border border-risk/30 rounded-lg px-4 py-2">{fError}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={isPending}
              className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 transition-opacity">
              {isPending ? 'Creando…' : 'Crear usuario'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card  overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            </div>
            <p className="text-sm font-semibold text-foreground">Sin usuarios</p>
            <p className="text-xs text-muted-foreground">Crea el primer usuario para comenzar.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredUsers.map(u => (
              <div key={u.id} className="px-5 py-4 hover:bg-secondary/20 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-ink">{u.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </div>
                    {/* Memberships */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {u.memberships.map(m => (
                        <div key={m.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5">
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{m.tenant?.name ?? m.tenantId}</span>
                          <select
                            value={m.role}
                            onChange={e => handleRoleChange(u.id, m.tenantId, e.target.value)}
                            className={cn(
                              'text-[11px] font-bold rounded-md px-2 py-0.5 border-0 cursor-pointer focus:outline-none',
                              ROLE_COLORS[m.role] ?? ROLE_COLORS.client
                            )}
                          >
                            <option value="client">Cliente</option>
                            <option value="tenant_admin">Admin del cliente</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Superadmin</option>
                          </select>
                          <button
                            onClick={() => handleRemove(u.id, m.tenantId)}
                            className="text-muted-foreground hover:text-risk transition-colors ml-1"
                            title="Quitar de empresa"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                      {u.memberships.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">Sin empresa asignada</span>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(u.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Editar usuario"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => { setPwUser(u); setPwValue(''); setPwError('') }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Restablecer contraseña"
                      aria-label="Restablecer contraseña"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-risk hover:bg-risk-tint transition-colors"
                      title="Eliminar usuario"
                      aria-label="Eliminar usuario"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
