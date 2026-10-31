"use client"

import { useEffect, useState } from "react"
import type { RegulatoryItem } from "@/app/actions/regulatory-items"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import type { Firm } from "@/lib/types"
import { authClient } from "@/lib/auth-client"

// ── Derived metrics (compliance-focused MVP) ─────────────────────
type DashboardItem = RegulatoryItem & { evidence?: unknown[] }

const getDaysLeft = (date: string | null | undefined, referenceDate: string) => date ? Math.ceil((new Date(`${date}T00:00:00`).getTime() - new Date(`${referenceDate}T00:00:00`).getTime()) / 86400000) : null

function getMetrics(items: DashboardItem[], referenceDate: string) {
  const withDays = items.map(item => ({ item, daysLeft: getDaysLeft(item.dueDate, referenceDate) }))
  const overdue = withDays.filter(({ daysLeft }) => daysLeft !== null && daysLeft < 0)
  const dueSoon = withDays.filter(({ daysLeft }) => daysLeft !== null && daysLeft >= 0 && daysLeft <= 30)
  const inProgress = items.filter(item => ["aceptada", "en_proceso", "revision"].includes(item.status))
  const accepted = items.filter(item => item.status === "aceptada")
  const sent = items.filter(item => item.sentAt)
  return { withDays, overdue, dueSoon, inProgress, accepted, sent }
}

function buildMetrics(items: DashboardItem[], referenceDate: string) {
  const { overdue, dueSoon, inProgress, sent } = getMetrics(items, referenceDate)
  const vigentes = items.filter(item => item.status === "vigente" || item.status === "completado")
  return [
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
    label: "Vencidos", value: overdue.length, sub: overdue.length ? "requieren acción inmediata" : "sin asuntos vencidos", href: "/admin/obligaciones", accent: "var(--risk-tint)", iconColor: "var(--risk)",
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    label: "Por vencer", value: dueSoon.length, sub: "con vencimiento en 30 días", href: "/admin/obligaciones", accent: "var(--warn-tint)", iconColor: "var(--warn-text)",
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    label: "En proceso", value: inProgress.length, sub: `${sent.length} enviados · ${vigentes.length} cerrados`, href: "/admin/obligaciones", accent: "var(--ok-tint)", iconColor: "var(--ok)",
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    label: "Asuntos", value: items.length, sub: `${sent.length} visibles al cliente`, href: "/admin/documentos", accent: "var(--surface-sunken)", iconColor: "var(--ink)",
  },
  ]
}

// ── Main ─────────────────────────────────────────────────────────
export default function AdminDashboard({ items, referenceDate }: { items: DashboardItem[]; referenceDate: string }) {
  const { overdue, dueSoon, inProgress, sent } = getMetrics(items, referenceDate)
  const metrics = buildMetrics(items, referenceDate)
  const urgentItems = [...overdue, ...dueSoon].slice(0, 5)
  const today = new Date(`${referenceDate}T00:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const { data: session } = authClient.useSession()
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  const userName = hydrated && session?.user?.name?.trim() ? session.user.name.trim() : "Otero"

  return (
    <div className="min-h-full bg-background">

      {/* ── Hero banner with image ───────────────────── */}
      <div className="relative h-52 xl:h-60 overflow-hidden">
        <Image
          src="/images/dashboard-hero.png"
          alt="Vista aérea costera"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-surface/85" />

        {/* Text on image */}
        <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-8 xl:px-10 pb-6 sm:pb-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-surface/49" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text">Asistente Otero</span>
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink sm:text-4xl xl:text-5xl leading-tight">
                Buenos días, {userName}
              </h1>
              <p className="mt-1 text-sm text-ink/65 capitalize">Centro de cumplimiento regulatorio · {today}</p>
            </div>

            {/* Quick metric chips on image */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {overdue.length + dueSoon.length > 0 && (
                <div className="flex items-center gap-2 bg-brand/10 border border-brand-text/20 rounded-xl px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-brand" />
                  <span className="text-brand-text text-sm font-semibold">{overdue.length + dueSoon.length} asuntos con fecha cercana</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-surface/80 border border-border rounded-xl px-4 py-2.5">
                <span className="text-ink/70 text-sm font-semibold">{items.length} asuntos · {inProgress.length} en proceso</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content grid ────────────────────────── */}
      <div className="px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
        <div className="flex flex-col xl:flex-row gap-8">

          {/* ── Left column: metrics ─────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* KPI grid — 4 columns on wide screens */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {metrics.map((m, i) => (
                <Link key={i} href={m.href}
                  className="group flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4  transition-all hover:border-foreground/15  sm:gap-4 sm:px-5 sm:py-5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: m.accent }}>
                      <span style={{ color: m.iconColor }}>{m.icon}</span>
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-serif text-2xl font-bold leading-none text-foreground sm:text-3xl">{m.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Right column: compliance activity ── */}
          <div className="xl:w-72 2xl:w-80 shrink-0 flex flex-col gap-4">

            {/* Urgentes */}
            <div className="rounded-xl border border-border bg-card  overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Asuntos regulatorios urgentes</h3>
                <Link href="/admin/obligaciones" className="text-xs text-ink font-semibold hover:text-ink transition-colors">Ver todas</Link>
              </div>
              <div className="divide-y divide-border">
{urgentItems.map(({ item, daysLeft }) => (
                  <Link key={item.id} href={`/admin/obligaciones/${item.id}?tenant=${item.tenantId}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors group">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", daysLeft !== null && daysLeft < 0 ? "bg-risk" : "bg-warn")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{item.materia} · {item.status}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0",
                      daysLeft !== null && daysLeft < 0 ? "bg-risk-tint text-risk" : "bg-warn-tint text-warn-text"
                    )}>{daysLeft !== null && daysLeft < 0 ? "Vencido" : `${daysLeft} días`}</span>
                  </Link>
                ))}
                {overdue.length + dueSoon.length === 0 && (
                  <div className="px-5 py-6 text-center">
                    <p className="text-xs text-muted-foreground">Sin obligaciones urgentes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick links — MVP */}
            <div className="rounded-xl border border-border bg-card  p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Accesos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Asuntos regulatorios", href: "/admin/obligaciones", color: "var(--risk)", bg: "var(--risk-tint)" },
                  { label: "Documentos",   href: "/admin/documentos", color: "var(--ink)", bg: "var(--surface-sunken)" },
                ].map(q => (
                  <Link key={q.href} href={q.href}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: q.color }} />
                    <span className="text-xs font-medium text-foreground">{q.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
