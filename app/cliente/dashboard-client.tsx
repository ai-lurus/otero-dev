"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { RegulatoryItem as Obligation } from "@/app/actions/regulatory-items"

type DashboardObligation = Obligation & { daysLeft: number; category: string }

function toDashboardObligation(obligation: Obligation, referenceDate: string): DashboardObligation {
  const daysLeft = obligation.dueDate
    ? Math.ceil((new Date(`${obligation.dueDate}T00:00:00`).getTime() - new Date(`${referenceDate}T00:00:00`).getTime()) / 86400000)
    : 999
  const isOpen = obligation.status === "identificada" || obligation.status === "aceptada"
  const status = !isOpen ? obligation.status : daysLeft < 0 ? "vencido" : daysLeft <= 30 ? "por_vencer" : obligation.status
  return { ...obligation, status, daysLeft, category: obligation.source.toLowerCase() }
}

// Donut ring SVG
function ComplianceRing({ total, vencidos, porVencer, vigentes }: { total: number; vencidos: DashboardObligation[]; porVencer: DashboardObligation[]; vigentes: DashboardObligation[] }) {
  const size   = 120
  const r      = 44
  const circ   = 2 * Math.PI * r
  const cx     = size / 2
  const cy     = size / 2
  const stroke = 11

const pVencido  = total > 0 ? vencidos.length / total : 0
  const pPorVen   = total > 0 ? porVencer.length / total : 0
  const pVigente  = total > 0 ? vigentes.length / total : 0

  // Segments: draw from -π/2 (top)
  function arc(from: number, pct: number) {
    const start = from * circ
    return { dashoffset: -start, dasharray: `${pct * circ} ${circ}` }
  }

  const seg1 = arc(0, pVencido)
  const seg2 = arc(pVencido, pPorVen)
  const seg3 = arc(pVencido + pPorVen, pVigente)

  const score = total > 0 ? Math.round((vigentes.length / total) * 100) : 0

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
        {/* vencido */}
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--risk)" strokeWidth={stroke} strokeLinecap="butt"
          strokeDasharray={seg1.dasharray}
          strokeDashoffset={seg1.dashoffset}
        />
        {/* por vencer */}
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--warn)" strokeWidth={stroke} strokeLinecap="butt"
          strokeDasharray={seg2.dasharray}
          strokeDashoffset={seg2.dashoffset}
        />
        {/* vigente */}
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--ok)" strokeWidth={stroke} strokeLinecap="butt"
          strokeDasharray={seg3.dasharray}
          strokeDashoffset={seg3.dashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-2xl font-bold text-foreground leading-none">{score}</span>
        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide mt-0.5">score</span>
      </div>
    </div>
  )
}

// Horizontal stacked bar
function StatusBar({ className, total, vencidos, porVencer, vigentes }: { className?: string; total: number; vencidos: DashboardObligation[]; porVencer: DashboardObligation[]; vigentes: DashboardObligation[] }) {
  return (
    <div className={cn("flex h-2 rounded-full overflow-hidden gap-px", className)}>
      <div className="bg-risk rounded-l-full transition-all" style={{ width: `${(vencidos.length / total) * 100}%` }} />
      <div className="bg-warn transition-all"              style={{ width: `${(porVencer.length / total) * 100}%` }} />
      <div className="bg-ok rounded-r-full transition-all" style={{ width: `${(vigentes.length / total) * 100}%` }} />
    </div>
  )
}

// Days urgency mini-bar (0–30 range)
function UrgencyBar({ daysLeft, status }: { daysLeft: number; status: string }) {
  const max = 30
  const pct = status === "vencido" ? 100 : Math.max(0, Math.min(100, ((max - daysLeft) / max) * 100))
  const color = status === "vencido" ? "var(--risk)" : daysLeft <= 7 ? "var(--risk)" : daysLeft <= 15 ? "var(--warn-text)" : "var(--warn-text)"
  return (
    <div className="w-16 h-1 bg-border rounded-full overflow-hidden shrink-0">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function ClienteHome({ obligations, accountName, referenceDate }: { obligations: Obligation[]; accountName: string; referenceDate: string }) {
  const compliance = obligations.map((obligation) => toDashboardObligation(obligation, referenceDate))
  const vencidos = compliance.filter((c) => c.status === "vencido")
  const porVencer = compliance.filter((c) => c.status === "por_vencer")
  const vigentes = compliance.filter((c) => c.status !== "vencido" && c.status !== "por_vencer")
  const total = compliance.length
  const { data: session } = authClient.useSession()
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  const userName = hydrated ? session?.user?.name?.trim() || "Usuario" : "Usuario"
  const urgent = vencidos.length + porVencer.length
  const [aiDismissed, setAiDismissed] = useState(false)
  const [aiExpanded, setAiExpanded] = useState(true)

  return (
    <div className="min-h-full">

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div className="relative h-36 sm:h-40 lg:h-44 overflow-hidden">
        <Image
          src="/images/compliance-hero.png"
          alt="Edificio corporativo"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-ink/70" />

        <div className="absolute inset-0 flex flex-col justify-end px-5 sm:px-8 xl:px-10 pb-4 sm:pb-5">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl xl:text-4xl font-semibold text-surface leading-tight text-balance">
                {userName}
              </h1>
              <p className="mt-1 text-sm text-surface/55">Cuenta: {accountName} · Otero</p>
            </div>
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {urgent > 0 && (
                <Link href="/cliente/obligaciones" className="flex items-center gap-2 bg-risk/20 border border-risk/30 rounded-xl px-4 py-2.5 hover:bg-risk/30 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-risk animate-pulse" />
                  <span className="text-risk text-sm font-semibold">{urgent} alertas activas</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="px-4 sm:px-6 xl:px-10 py-5 sm:py-8 flex flex-col gap-5 sm:gap-6">

        <Link
          href="/cliente/chat"
          className="group flex items-center gap-3 rounded-2xl border border-ok/20 bg-ok-tint px-4 py-3.5 hover:border-ok/40 transition-colors"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ok text-surface">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Habla con Otero</span>
            <span className="block text-xs text-ok">Resuelve dudas sobre tus obligaciones y regulaciones</span>
          </span>
          <svg className="h-4 w-4 shrink-0 text-ok transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>

        {/* ── Compliance score card ── */}
        <div className="rounded-2xl border border-border bg-card  p-6">
          <div className="flex items-start gap-6">
            <ComplianceRing total={total} vencidos={vencidos} porVencer={porVencer} vigentes={vigentes} />

            <div className="flex-1 min-w-0 flex flex-col gap-4">
              <div>
                <h2 className="portal-section-title text-sm font-semibold text-foreground mb-0.5">Estado de cumplimiento</h2>
                <p className="text-xs text-muted-foreground">{total} obligaciones · {vigentes.length} en regla</p>
              </div>

              {/* Stacked bar */}
              <StatusBar total={total} vencidos={vencidos} porVencer={porVencer} vigentes={vigentes} />

              {/* Legend row */}
              <div className="flex items-center gap-4 flex-wrap">
                <Link href="/cliente/obligaciones" className="flex items-center gap-1.5 group">
                  <span className="w-2.5 h-2.5 rounded-full bg-risk shrink-0" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    <span className="font-bold text-foreground">{vencidos.length}</span> vencido{vencidos.length !== 1 ? "s" : ""}
                  </span>
                </Link>
                <Link href="/cliente/obligaciones" className="flex items-center gap-1.5 group">
                  <span className="w-2.5 h-2.5 rounded-full bg-warn shrink-0" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    <span className="font-bold text-foreground">{porVencer.length}</span> por vencer
                  </span>
                </Link>
                <Link href="/cliente/obligaciones" className="flex items-center gap-1.5 group">
                  <span className="w-2.5 h-2.5 rounded-full bg-ok shrink-0" />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    <span className="font-bold text-foreground">{vigentes.length}</span> vigentes
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["permiso", "fiscal", "contrato", "tramite"] as const).map((cat) => {
              const items = compliance.filter(c => c.category === cat)
              const bad   = items.filter(c => c.status === "vencido" || c.status === "por_vencer").length
              const pct   = items.length ? Math.round((items.filter(c => c.status !== "vencido" && c.status !== "por_vencer").length / items.length) * 100) : 100
              const labels: Record<string, string> = { permiso: "Permisos", fiscal: "Fiscal", contrato: "Contratos", tramite: "Trámites" }
              return (
                <div key={cat} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{labels[cat]}</span>
                    {bad > 0 && (
                      <span className="text-[9px] font-bold text-risk bg-risk-tint px-1.5 py-0.5 rounded-full">{bad}</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: pct === 100 ? "var(--ok)" : pct >= 70 ? "var(--warn)" : "var(--risk)" }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{items.length} docs · {pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── AI Insight banner ── */}
        {!aiDismissed && urgent > 0 && (
          <div className="relative rounded-2xl overflow-hidden bg-ink text-surface ">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-ok opacity-20 blur-3xl -translate-y-16 translate-x-16 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 px-6 pt-5 pb-3">
                <div className="w-7 h-7 rounded-lg bg-surface/12 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <span className="text-xs font-bold tracking-wider uppercase text-surface/60 flex-1">Resumen IA — Esta semana</span>
                <button
                  onClick={() => setAiExpanded(v => !v)}
                  className="w-7 h-7 rounded-full bg-surface/10 flex items-center justify-center hover:bg-surface/15 transition-colors"
                >
                  <svg className={cn("w-3.5 h-3.5 text-surface/60 transition-transform", aiExpanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setAiDismissed(true)}
                  className="w-7 h-7 rounded-full bg-surface/10 flex items-center justify-center hover:bg-surface/15 transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-surface/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {aiExpanded && (
                <div className="px-6 pb-6">
                  <p className="text-sm leading-relaxed text-surface/85 mb-4">
                    Tienes{" "}
                    <span className="font-bold text-surface">
                      {vencidos.length} {vencidos.length === 1 ? "documento vencido" : "documentos vencidos"}
                    </span>{" "}
                    y{" "}
                    <span className="font-bold text-surface">{porVencer.length} por vencer</span>{" "}
                    en los próximos 30 días. La Licencia Ambiental de Planta Vallejo Norte tiene solo 17 días de margen — inicia la renovación hoy para evitar operar sin vigencia.
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    <Link
                      href="/cliente/obligaciones"
                      className="inline-flex items-center gap-2 bg-surface-raised text-ink text-xs font-semibold py-2.5 px-4 rounded-lg hover:bg-surface/90 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      Ver asuntos regulatorios
                    </Link>
                    <Link
                      href="/cliente/documentos"
                      className="inline-flex items-center gap-2 bg-surface/12 border border-surface/15 text-surface text-xs font-semibold py-2.5 px-4 rounded-lg hover:bg-surface/18 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Subir documento
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Urgentes list ── */}
        <div className="rounded-2xl border border-border bg-card  overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Requieren atención</h2>
            <Link href="/cliente/obligaciones" className="text-xs text-ink font-semibold hover:text-ink-muted transition-colors">
              Ver todas
            </Link>
          </div>

          {compliance.filter(c => c.status === "vencido" || c.status === "por_vencer").length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-ok-tint flex items-center justify-center">
                <svg className="w-6 h-6 text-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-foreground">Todo en orden</p>
              <p className="text-xs text-muted-foreground">No hay obligaciones urgentes en este momento.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {compliance
                .filter(c => c.status === "vencido" || c.status === "por_vencer")
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .slice(0, 5)
                .map((c) => {
                  const isVencido = c.status === "vencido"
                  return (
                    <Link
                      key={c.id}
                      href="/cliente/obligaciones"
                      className={cn(
                        "flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors group",
                        "border-l-2",
                        isVencido ? "border-l-risk" : "border-l-warn"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                            isVencido ? "bg-risk-tint text-risk" : "bg-warn-tint text-warn-text"
                          )}>
                            {isVencido
                              ? `Vencido hace ${Math.abs(c.daysLeft)}d`
                              : `Vence en ${c.daysLeft}d`}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">{c.category}</span>
                        </div>
                      </div>
                      <UrgencyBar daysLeft={c.daysLeft} status={c.status} />
                      <svg className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  )
                })}
            </div>
          )}
        </div>

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/cliente/obligaciones"
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5  hover:border-border-strong transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-surface-sunken flex items-center justify-center">
              <svg className="w-5 h-5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Asuntos regulatorios</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ver matriz completa</p>
            </div>
          </Link>

          <Link
            href="/cliente/documentos"
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5  hover:border-ok/20 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-ok-tint flex items-center justify-center">
              <svg className="w-5 h-5 text-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Subir documento</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Agregar a tu expediente</p>
            </div>
          </Link>
        </div>

      </div>
    </div>
  )
}
