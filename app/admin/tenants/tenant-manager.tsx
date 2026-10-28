'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTenant, deleteTenant, updateTenantSlug } from '@/app/actions/admin'
import type { Tenant } from '@/lib/db/schema'
import { cn } from '@/lib/utils'

interface Props {
  tenants: Tenant[]
  userCountByTenant: Record<string, number>
}

const INDUSTRIES = ['Manufactura', 'Hidrocarburos', 'Transporte', 'Gasolineras', 'Construcción', 'Comercio', 'Servicios', 'Otro']

export default function TenantManager({ tenants, userCountByTenant }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [name,     setName]     = useState('')
  const [rfc,      setRfc]      = useState('')
  const [industry, setIndustry] = useState('Manufactura')
  const [error,    setError]    = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingSlug, setEditingSlug] = useState<string | null>(null) // tenantId being edited
  const [slugValue, setSlugValue]     = useState('')
  const [slugError, setSlugError]     = useState('')

  async function handleSlugSave(tenantId: string) {
    setSlugError('')
    try {
      await updateTenantSlug(tenantId, slugValue)
      setEditingSlug(null)
      router.refresh()
    } catch (err: unknown) {
      setSlugError(err instanceof Error ? err.message : 'Error')
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await createTenant({ name: name.trim(), rfc: rfc.trim() || undefined, industry })
        setShowForm(false)
        setName(''); setRfc(''); setIndustry('Manufactura')
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al crear empresa')
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta empresa y todos sus datos?')) return
    setDeleting(id)
    try {
      await deleteTenant(id)
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tenants.length} empresa{tenants.length !== 1 ? 's' : ''} registrada{tenants.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Nueva empresa
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-border bg-card p-6  space-y-4"
        >
          <h2 className="text-sm font-semibold text-foreground">Nueva empresa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Razón social *</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="Monterrico Industrias S.A."
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">RFC</label>
              <input
                type="text" value={rfc} onChange={e => setRfc(e.target.value)}
                placeholder="MIN010101ABC"
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Industria</label>
              <select
                value={industry} onChange={e => setIndustry(e.target.value)}
                className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              >
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-risk bg-risk-tint border border-risk/30 rounded-lg px-4 py-2">{error}</p>}
          <div className="flex gap-3">
            <button
              type="submit" disabled={isPending}
              className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? 'Guardando…' : 'Crear empresa'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tenant list */}
      <div className="rounded-xl border border-border bg-card  overflow-hidden">
        {tenants.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
            </div>
            <p className="text-sm font-semibold text-foreground">Sin empresas registradas</p>
            <p className="text-xs text-muted-foreground">Crea la primera empresa para comenzar.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresa</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">RFC</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Portal de login</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Industria</th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Usuarios</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Alta</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-ink">{t.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-semibold text-foreground">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell font-mono text-xs">{t.rfc ?? '—'}</td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {editingSlug === t.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">/login/</span>
                        <input
                          value={slugValue}
                          onChange={e => setSlugValue(e.target.value)}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs w-28 focus:outline-none focus:ring-2 focus:ring-foreground/20"
                          placeholder="mi-empresa"
                          autoFocus
                        />
                        <button onClick={() => handleSlugSave(t.id)} className="text-xs font-semibold text-ink hover:underline">Guardar</button>
                        <button onClick={() => setEditingSlug(null)} className="text-xs text-muted-foreground hover:underline">Cancelar</button>
                        {slugError && <span className="text-xs text-risk">{slugError}</span>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {t.slug ? (
                          <code className="text-xs bg-secondary px-2 py-0.5 rounded font-mono">/login/{t.slug}</code>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin slug</span>
                        )}
                        <button
                          onClick={() => { setEditingSlug(t.id); setSlugValue(t.slug ?? ''); setSlugError('') }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground">{t.industry ?? '—'}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-bold text-foreground">{userCountByTenant[t.id] ?? 0}</span>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground hidden lg:table-cell">
                    {new Date(t.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      className={cn(
                        'text-xs text-muted-foreground hover:text-risk transition-colors disabled:opacity-40',
                      )}
                    >
                      {deleting === t.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
