'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

export default function AuthForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await authClient.signIn.email({ email, password })
      if (res.error) {
        setError('No pudimos iniciar sesión. Verifica tu correo y contraseña.')
        return
      }

      // Perform a full navigation so the server reads the newly-set session cookie
      // and resolves the correct role-based destination.
      window.location.assign(callbackUrl || '/sign-in')
    } catch {
      setError('No pudimos conectar con el servicio de acceso. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-serif text-2xl font-semibold text-foreground tracking-tight">Otero</span>
          <p className="mt-1 text-sm text-muted-foreground">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-foreground uppercase tracking-wide">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@empresa.com"
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-foreground uppercase tracking-wide">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'mt-2 rounded-xl bg-foreground py-3 text-sm font-semibold text-background transition-opacity',
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
            )}
          >
            {loading ? 'Cargando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Aún no tienes acceso?{' '}
          <a
            href="mailto:contact@otero.ai?subject=Agendar demo de Otero"
            className="font-semibold text-foreground hover:underline"
          >
            Agenda una demo
          </a>
        </p>
      </div>
    </div>
  )
}
