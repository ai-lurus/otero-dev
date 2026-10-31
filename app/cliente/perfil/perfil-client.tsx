"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { saveCompanyProfile } from "@/app/actions/company-profile"
import type { CompanyProfile } from "@/lib/db/schema"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">{title}</p>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
  href,
  danger,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  href?: string
  danger?: boolean
  onPress?: () => void
}) {
  const inner = (
    <div className={cn("flex items-center gap-3 px-4 py-3.5 border-b border-border/50 last:border-0 active:bg-muted/50 transition-colors", danger && "active:bg-risk-tint")}>
      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", danger ? "bg-risk-tint text-risk" : "bg-muted text-muted-foreground")}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", danger ? "text-risk" : "text-foreground")}>{label}</p>
        {value && <p className="text-xs text-muted-foreground mt-0.5 truncate">{value}</p>}
      </div>
      {(href || onPress) && !danger && (
        <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      )}
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  if (onPress) return <button className="w-full text-left" onClick={onPress}>{inner}</button>
  return inner
}

const COMPANY_FIELDS = [
  { key: "description",    label: "Descripción de la empresa",        placeholder: "Ej. Grupo industrial con plantas manufactureras en el norte del país...", rows: 3 },
  { key: "industry",       label: "Industria / Sector",               placeholder: "Ej. Manufactura, Alimentos, Minería, Construcción...", rows: 1 },
  { key: "employees",      label: "Número de empleados",              placeholder: "Ej. 500-1000", rows: 1 },
  { key: "states",         label: "Estados donde opera",              placeholder: "Ej. Nuevo León, Jalisco, CDMX...", rows: 1 },
  { key: "activities",     label: "Actividades principales",          placeholder: "Ej. Fabricación de autopartes, almacenamiento de residuos peligrosos...", rows: 2 },
  { key: "certifications", label: "Certificaciones vigentes",         placeholder: "Ej. ISO 14001, EMAS, Industria Limpia...", rows: 1 },
  { key: "riesgos",        label: "Riesgos regulatorios conocidos",   placeholder: "Ej. Licencias SEMARNAT pendientes, auditorías PROFEPA recientes...", rows: 2 },
] as const

type PerfilClientProps = {
  user: { name: string; email: string }
  profile: CompanyProfile | null
  /** Sección del perfil de monitoreo, armada en el servidor. */
  children?: React.ReactNode
}

export default function PerfilClient({ user, profile, children }: PerfilClientProps) {
  const [notifs, setNotifs] = useState({ compliance: true, documentos: true, chat: true, pagos: true })
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" })
  const [pwSaved, setPwSaved] = useState(false)

  const [companyForm, setCompanyForm] = useState({
    description: profile?.description ?? "",
    industry: profile?.industry ?? "",
    employees: profile?.employees ?? "",
    states: profile?.states ?? "",
    activities: profile?.activities ?? "",
    certifications: profile?.certifications ?? "",
    riesgos: profile?.riesgos ?? "",
  })
  const [companySaving, setCompanySaving] = useState(false)
  const [companySaved, setCompanySaved]   = useState(false)

  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    setCompanySaving(true)
    try {
      await saveCompanyProfile(companyForm)
      setCompanySaved(true)
      setTimeout(() => setCompanySaved(false), 2500)
    } finally {
      setCompanySaving(false)
    }
  }

  function savePassword() {
    if (pwForm.next && pwForm.next === pwForm.confirm) {
      setPwSaved(true)
      setTimeout(() => { setShowPasswordForm(false); setPwSaved(false); setPwForm({ current: "", next: "", confirm: "" }) }, 1500)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Dark header */}
      <div className="bg-ink px-6 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-warn/20 border border-warn-text/30 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-warn-text">GIM</span>
          </div>
          <div>
            <h1 className="font-serif text-xl font-semibold text-surface leading-snug">{user.name}</h1>
            <p className="text-surface/40 text-xs mt-0.5">Perfil conectado</p>
            <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full bg-ok/30 text-ok">
              <span className="w-1.5 h-1.5 rounded-full bg-ok" />
              Cliente activo
            </span>
          </div>
        </div>
      </div>

      <div className="bg-background rounded-t-3xl -mt-2 px-5 pt-6 pb-6 flex flex-col gap-5">

        {/* Cuenta */}
        <Section title="Cuenta">
          <Row
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
            label="Nombre"
            value={user.name}
          />
          <Row
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>}
            label="Correo electrónico"
            value={user.email}
          />
          <Row
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>}
            label="Teléfono"
            value="+52 998 123 4567"
          />
        </Section>

        {/* Perfil de empresa — contexto para Compi IA */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Perfil de empresa</p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Info banner */}
            <div className="flex items-start gap-2.5 px-4 py-3 border-b border-border bg-surface-sunken">
              <svg className="w-4 h-4 text-ink shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <p className="text-[11px] text-ink font-medium leading-snug">
                Otero usa esta información para personalizar sus respuestas según tu empresa y sector.
              </p>
            </div>
            <form onSubmit={handleSaveCompany} className="px-4 pt-4 pb-3 flex flex-col gap-4">
              {COMPANY_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                    {f.label}
                  </label>
                  {f.rows > 1 ? (
                    <textarea
                      rows={f.rows}
                      value={companyForm[f.key]}
                      onChange={e => setCompanyForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-ink/20 resize-none placeholder:text-muted-foreground/40"
                    />
                  ) : (
                    <input
                      type="text"
                      value={companyForm[f.key]}
                      onChange={e => setCompanyForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-ink/20 placeholder:text-muted-foreground/40"
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                disabled={companySaving}
                className={cn(
                  "w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
                  companySaved
                    ? "bg-ok text-surface"
                    : "bg-ink text-surface disabled:opacity-50"
                )}
              >
                {companySaving ? "Guardando..." : companySaved ? "Guardado — Otero ya lo sabe" : "Guardar perfil de empresa"}
              </button>
            </form>
          </div>
        </div>

        {children}

        {/* Seguridad */}
        <Section title="Seguridad">
          <Row
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>}
            label="Cambiar contraseña"
            onPress={() => setShowPasswordForm(v => !v)}
          />
          {showPasswordForm && (
            <div className="px-4 pb-4 pt-1 flex flex-col gap-3 border-b border-border/50">
              {["current", "next", "confirm"].map((field) => (
                <div key={field}>
                  <label className="text-[10px] text-muted-foreground font-medium block mb-1">
                    {field === "current" ? "Contraseña actual" : field === "next" ? "Nueva contraseña" : "Confirmar nueva contraseña"}
                  </label>
                  <input
                    type="password"
                    value={pwForm[field as keyof typeof pwForm]}
                    onChange={e => setPwForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-ink/20"
                    placeholder="••••••••"
                  />
                </div>
              ))}
              <button
                onClick={savePassword}
                className={cn(
                  "w-full py-2.5 rounded-xl text-sm font-semibold transition-all",
                  pwSaved ? "bg-ok text-surface" : "bg-ink text-surface active:scale-[0.98]"
                )}
              >
                {pwSaved ? "Contraseña actualizada" : "Guardar contraseña"}
              </button>
            </div>
          )}
          <Row
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>}
            label="Autenticación de dos factores"
            value="Activada"
          />
        </Section>

        {/* Notificaciones */}
        <Section title="Notificaciones">
          {[
            { key: "compliance", label: "Alertas de compliance", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg> },
            { key: "documentos", label: "Nuevos documentos", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg> },
            { key: "chat", label: "Mensajes nuevos", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg> },
            { key: "pagos", label: "Recordatorios de pago", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg> },
          ].map(item => (
            <div key={item.key} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
              <div className="w-8 h-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <p className="text-sm font-medium text-foreground flex-1">{item.label}</p>
              <button
                onClick={() => setNotifs(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                className={cn(
                  "w-11 h-6 rounded-full relative transition-colors shrink-0",
                  notifs[item.key as keyof typeof notifs] ? "bg-ink" : "bg-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-5 h-5 bg-surface-raised rounded-full  transition-all",
                  notifs[item.key as keyof typeof notifs] ? "left-[22px]" : "left-0.5"
                )} />
              </button>
            </div>
          ))}
        </Section>

        {/* Soporte */}
        <Section title="Soporte">
          <Row
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>}
            label="Ayuda y preguntas frecuentes"
            href="/cliente/ayuda"
          />
          <Row
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
            label="Términos y privacidad"
            href="/cliente/terminos"
          />
        </Section>

        {/* Cerrar sesión */}
        <Section title="Sesión">
          <Row
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>}
            label="Cerrar sesión"
            danger
            onPress={() => {}}
          />
        </Section>

        <p className="text-center text-[10px] text-muted-foreground/40 pb-2">v2.1.0 · Portal Legal Empresarial</p>
      </div>
    </div>
  )
}
