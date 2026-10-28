'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

interface Props {
  tenantId: string
  tenantName: string
}

export function TenantLoginForm({ tenantId, tenantName }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password })
      if (result.error) {
        setError('Correo o contraseña incorrectos.')
        return
      }

      // Verify the signed-in user belongs to this tenant
      const me = await authClient.getSession()
      const userId = me?.data?.user?.id
      if (!userId) { setError('No se pudo verificar la sesión.'); return }

      // Call our API to verify tenant membership
      const check = await fetch(`/api/auth/verify-tenant?userId=${userId}&tenantId=${tenantId}`)
      if (!check.ok) {
        await authClient.signOut()
        setError('No tienes acceso a este portal. Contacta a tu administrador.')
        return
      }

      const callbackUrl = searchParams.get('callbackUrl')
      router.push(callbackUrl ?? '/cliente')
      router.refresh()
    } catch {
      setError('Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-surface/30 mb-2">{tenantName}</p>
        <h2 className="font-serif text-3xl font-semibold text-surface leading-tight">Bienvenido</h2>
        <p className="mt-2 text-sm text-surface/40">Inicia sesión en tu portal de compliance.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-surface/40 text-[11px] font-semibold uppercase tracking-[0.12em]">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full bg-surface/[0.06] border border-surface/[0.1] rounded-xl px-4 py-3.5 text-surface text-sm placeholder:text-surface/20 focus:outline-none focus:border-surface/25 focus:bg-surface/[0.08] transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-surface/40 text-[11px] font-semibold uppercase tracking-[0.12em]">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full bg-surface/[0.06] border border-surface/[0.1] rounded-xl px-4 py-3.5 text-surface text-sm placeholder:text-surface/20 focus:outline-none focus:border-surface/25 focus:bg-surface/[0.08] transition-all"
          />
        </div>

        {error && (
          <p className="text-risk text-xs text-center bg-risk/10 rounded-lg px-4 py-2.5 border border-risk/20">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-semibold bg-surface-raised text-ink hover:bg-surface/90 active:scale-[0.98] transition-all mt-1 disabled:opacity-60 disabled:pointer-events-none"
        >
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  )
}
