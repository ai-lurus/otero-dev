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

const AI_INSIGHTS = [
  {
    id: "ai1", priority: "alta",
    title: "Certificado PROFEPA vencido — acción inmediata",
    body: "El certificado de emisiones de Grupo Industrial Monterrico venció hace 8 días. PROFEPA puede iniciar un procedimiento de verificación. Presentar escrito de prórroga esta semana.",
    action: "Ver asuntos", href: "/admin/obligaciones", firm: "paulsen" as Firm,
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
  },
  {
    id: "ai2", priority: "alta",
    title: "Licencia Ambiental Planta Vallejo vence en 17 días",
    body: "SEMARNAT tarda ~30 días hábiles en emitir respuesta. Con 17 días de margen el cliente ya está en zona de riesgo. Iniciar el trámite de renovación hoy.",
    action: "Ver asuntos", href: "/admin/obligaciones", firm: "paulsen" as Firm,
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    id: "ai3", priority: "alta",
    title: "Alerta escalada sin atender — Contrato de Arrendamiento",
    body: "El Contrato de Arrendamiento de Torre Reforma vence en 28 días. La alerta lleva 60 horas sin acción y fue escalada automáticamente. Asignar responsable.",
    action: "Ver alertas", href: "/admin/obligaciones", firm: "mia" as Firm,
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
  },
  {
    id: "ai4", priority: "media",
    title: "AIA Parque Logístico Tultitlán vence en 22 días",
    body: "La Autorización de Impacto Ambiental requiere inspección previa al vencimiento. SEMARNAT debe agendar visita con al menos 3 semanas de anticipación — el margen es crítico.",
    action: "Ver documento", href: "/admin/obligaciones", firm: "paulsen" as Firm,
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  },
]

const PRIORITY_CFG = {
  alta:  { bar: "bg-red-500",   badge: "bg-red-50 text-red-700 border border-red-200",   label: "Urgente",  dot: "bg-red-500"   },
  media: { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border border-amber-200", label: "Atención", dot: "bg-amber-400" },
  baja:  { bar: "bg-blue-400",  badge: "bg-blue-50 text-blue-700 border border-blue-200",  label: "Info",     dot: "bg-blue-400"  },
}

function buildMetrics(items: DashboardItem[], referenceDate: string) {
  const { overdue, dueSoon, inProgress, sent } = getMetrics(items, referenceDate)
  const vigentes = items.filter(item => item.status === "vigente" || item.status === "completado")
  return [
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
    label: "Vencidos", value: overdue.length, sub: overdue.length ? "requieren acción inmediata" : "sin asuntos vencidos", href: "/admin/obligaciones", accent: "#FEF2F2", iconColor: "#DC2626",
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    label: "Por vencer", value: dueSoon.length, sub: "con vencimiento en 30 días", href: "/admin/obligaciones", accent: "#FFFBEB", iconColor: "#D97706",
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    label: "En proceso", value: inProgress.length, sub: `${sent.length} enviados · ${vigentes.length} cerrados`, href: "/admin/obligaciones", accent: "#F0FDF4", iconColor: "#16A34A",
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    label: "Asuntos", value: items.length, sub: `${sent.length} visibles al cliente`, href: "/admin/documentos", accent: "#EEF2F8", iconColor: "#1C2B4A",
  },
  ]
}

// ── Insight card ─────────────────────────────────────────────────
function InsightCard({ insight }: { insight: typeof AI_INSIGHTS[0] }) {
  const [expanded, setExpanded] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const pc = PRIORITY_CFG[insight.priority as keyof typeof PRIORITY_CFG]
  const firmColor = insight.firm === "paulsen" ? "#2D5A3D" : "#1C2B4A"
  const firmBg    = insight.firm === "paulsen" ? "#EAF2EC" : "#EEF2F8"

  if (dismissed) return null

  return (
    <div className={cn(
      "relative rounded-xl border bg-card shadow-sm overflow-hidden transition-all",
      insight.priority === "alta"  ? "border-red-200/80"   :
      insight.priority === "media" ? "border-amber-200/80" : "border-border"
    )}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", pc.bar)} />

      <div className="pl-4 pr-4 pt-3 pb-2.5 flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", pc.badge)}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", pc.dot)} />
            {pc.label}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: firmColor, background: firmBg }}>
            {insight.firm === "paulsen" ? "Ambiental" : "Corporativo"}
          </span>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors">
          <svg className={cn("w-3 h-3 text-muted-foreground transition-transform", expanded && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button onClick={() => setDismissed(true)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 hover:bg-muted/80 transition-colors">
          <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="pl-4 pr-4 pb-2 flex items-start gap-2">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: firmBg, color: firmColor }}>
          {insight.icon}
        </div>
        <p className="text-sm font-semibold text-foreground leading-snug">{insight.title}</p>
      </div>

      {expanded && (
        <div className="pl-4 pr-4 pb-4 pt-1">
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{insight.body}</p>
          <Link href={insight.href}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: firmColor }}>
            {insight.action}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </div>
      )}
    </div>
  )
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
  const [showAllInsights, setShowAllInsights] = useState(false)
  const visibleInsights = showAllInsights ? AI_INSIGHTS : AI_INSIGHTS.slice(0, 4)

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
        <div className="absolute inset-0 bg-gradient-to-r from-[#f7f5ef]/95 via-[#f7f5ef]/82 to-[#f7f5ef]/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f7f5ef]/90 via-[#f7f5ef]/35 to-transparent" />

        {/* Text on image */}
        <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-8 xl:px-10 pb-6 sm:pb-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-[#8badd4]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c42a6d]">Asistente Otero</span>
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight text-[#112133] sm:text-4xl xl:text-5xl leading-tight">
                Buenos días, {userName}
              </h1>
              <p className="mt-1 text-sm text-[#112133]/65 capitalize">Centro de cumplimiento regulatorio · {today}</p>
            </div>

            {/* Quick metric chips on image */}
            <div className="hidden lg:flex items-center gap-3 shrink-0">
              {overdue.length + dueSoon.length > 0 && (
                <div className="flex items-center gap-2 bg-[#c42a6d]/10 border border-[#c42a6d]/20 rounded-xl px-4 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#c42a6d]" />
                  <span className="text-[#c42a6d] text-sm font-semibold">{overdue.length + dueSoon.length} asuntos con fecha cercana</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-[#f7f5ef]/80 border border-[#112133]/10 rounded-xl px-4 py-2.5">
                <span className="text-[#112133]/70 text-sm font-semibold">{items.length} asuntos · {inProgress.length} en proceso</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content grid ────────────────────────── */}
      <div className="px-4 py-6 sm:px-6 sm:py-8 xl:px-10">
        <div className="flex flex-col xl:flex-row gap-8">

          {/* ── Left column: metrics + insights ─────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">

            {/* KPI grid — 4 columns on wide screens */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {metrics.map((m, i) => (
                <Link key={i} href={m.href}
                  className="group flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 shadow-sm transition-all hover:border-foreground/15 hover:shadow-md sm:gap-4 sm:px-5 sm:py-5">
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

            {/* AI Insights */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-6 h-6 rounded-lg bg-[#1C2B4A]/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-[#3D5A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-foreground">Recomendaciones IA</h2>
                <span className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">{AI_INSIGHTS.length} sugeridas</span>
              </div>

              {/* Two-column grid on large screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {visibleInsights.map(insight => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>

              {!showAllInsights && AI_INSIGHTS.length > 4 && (
                <button
                  onClick={() => setShowAllInsights(true)}
                  className="mt-3 w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  Ver {AI_INSIGHTS.length - 4} más
                </button>
              )}
            </div>
          </div>

          {/* ── Right column: compliance activity ── */}
          <div className="xl:w-72 2xl:w-80 shrink-0 flex flex-col gap-4">

            {/* Urgentes */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Asuntos regulatorios urgentes</h3>
                <Link href="/admin/obligaciones" className="text-xs text-[#29465a] font-semibold hover:text-[#1b3140] transition-colors">Ver todas</Link>
              </div>
              <div className="divide-y divide-border">
{urgentItems.map(({ item, daysLeft }) => (
                  <Link key={item.id} href={`/admin/obligaciones/${item.id}?tenant=${item.tenantId}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/40 transition-colors group">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", daysLeft !== null && daysLeft < 0 ? "bg-red-500" : "bg-amber-400")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{item.materia} · {item.status}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0",
                      daysLeft !== null && daysLeft < 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
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
            <div className="rounded-xl border border-border bg-card shadow-sm p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Accesos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Asuntos regulatorios", href: "/admin/obligaciones", color: "#DC2626", bg: "#FEF2F2" },
                  { label: "Documentos",   href: "/admin/documentos", color: "#1C2B4A", bg: "#EEF2F8" },
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
