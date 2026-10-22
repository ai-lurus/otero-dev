"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"

const ROLE_LABELS = {
  client: "Grupo Industrial Monterrico",
  admin: "Panel Administrativo",
} as const

type Role = "client" | "admin"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [role, setRole] = useState<Role>("client")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function switchRole(r: Role) {
    setRole(r)
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password })
      if (result.error) {
        setError("Correo o contraseña incorrectos.")
        return
      }
      const callbackUrl = searchParams.get("callbackUrl")
      router.push(callbackUrl ?? (role === "admin" ? "/admin" : "/cliente"))
      router.refresh()
    } catch {
      setError("Error al iniciar sesión. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Heading */}
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-semibold text-white leading-tight">
          Bienvenido
        </h2>
        <p className="mt-2 text-sm text-white/40">
          Inicia sesión en Otero.
        </p>
      </div>

      {/* Role selector */}
      <div className="flex gap-2 mb-8 p-1 bg-white/[0.05] rounded-xl border border-white/[0.08]">
        <button
          onClick={() => switchRole("client")}
          className={[
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
            role === "client"
              ? "bg-white text-[#0A1628] shadow-sm"
              : "text-white/40 hover:text-white/70",
          ].join(" ")}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Cliente
        </button>
        <button
          onClick={() => switchRole("admin")}
          className={[
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
            role === "admin"
              ? "bg-white text-[#0A1628] shadow-sm"
              : "text-white/40 hover:text-white/70",
          ].join(" ")}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Administrador
        </button>
      </div>

      {/* Context label */}
      <div className="mb-6 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${role === "admin" ? "bg-[#2D5A3D]/20" : "bg-[#1C2B4A]/20"}`}>
          {role === "client" ? (
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-white text-xs font-semibold leading-none">
            {ROLE_LABELS[role]}
          </p>
          <p className="text-white/35 text-[11px] mt-0.5">
            {role === "client" ? "Portal de cliente" : "Uso exclusivo del equipo interno"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-white/40 text-[11px] font-semibold uppercase tracking-[0.12em]">
            Correo electrónico
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.08] transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-white/40 text-[11px] font-semibold uppercase tracking-[0.12em]">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/25 focus:bg-white/[0.08] transition-all"
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center bg-red-400/10 rounded-lg px-4 py-2.5 border border-red-400/20">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={[
            "w-full py-3.5 rounded-xl text-sm font-semibold transition-all mt-1",
            role === "client"
              ? "bg-white text-[#0A1628] hover:bg-white/90 active:scale-[0.98]"
              : "bg-[#2D5A3D] text-white hover:bg-[#3a7050] active:scale-[0.98]",
            loading ? "opacity-60 pointer-events-none" : "",
          ].join(" ")}
        >
          {loading ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>
      </form>
    </div>
  )
}
