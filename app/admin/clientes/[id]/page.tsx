"use client"

import { notFound } from "next/navigation"
import Link from "next/link"
import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { adminClients, services, payments, clientDocuments, appointments } from "@/lib/data"
import { cn } from "@/lib/utils"
import {
  ArrowLeft, Mail, Phone, FileText, CreditCard, Calendar,
  ChevronRight, Download, AlertTriangle,
} from "lucide-react"
import type { Firm } from "@/lib/types"

function FirmPill({ firm }: { firm: Firm }) {
  return (
    <span className={cn(
      "text-[10px] font-bold px-2 py-0.5 rounded-full",
      firm === "paulsen" ? "bg-paulsen-light text-paulsen" : "bg-mia-light text-mia"
    )}>
      {firm === "paulsen" ? "Ambiental" : "Corporativo"}
    </span>
  )
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 })} MXN`
}

const STATUS_CONFIG = {
  solicitud:  { label: "Solicitud",   color: "var(--ink-muted)", bg: "var(--surface-sunken)" },
  en_proceso: { label: "En proceso",  color: "var(--ink)", bg: "var(--surface-sunken)" },
  revision:   { label: "En revisión", color: "var(--warn-text)", bg: "var(--warn-tint)" },
  completado: { label: "Completado",  color: "var(--ok)", bg: "var(--ok-tint)" },
  cancelado:  { label: "Cancelado",   color: "var(--risk)", bg: "var(--risk-tint)" },
}

type Tab = "servicios" | "pagos" | "documentos" | "agenda"

export default function AdminClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const client = adminClients.find(c => c.id === id)
  if (!client) notFound()

  const [activeTab, setActiveTab] = useState<Tab>("servicios")

  // Filter data to this client — using firm membership as the association
  // (in a real app this would be filtered by clientId)
  const clientServices  = services.filter(s => client.firms.includes(s.firm))
  const activeServices  = clientServices.filter(s => s.status !== "completado" && s.status !== "cancelado")
  const clientPayments  = payments.filter(p => client.firms.includes(p.firm))
  const clientDocs      = clientDocuments.filter(d => client.firms.includes(d.firm))
  const clientAppts     = appointments.filter(a => client.firms.includes(a.firm))

  const totalOwed   = clientPayments.filter(p => p.status !== "pagado").reduce((s, p) => s + p.amount, 0)
  const pendingDocs = clientDocs.filter(d => d.direction === "pendiente_firma")

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "servicios",  label: "Servicios",  count: clientServices.length },
    { id: "pagos",      label: "Pagos",       count: clientPayments.length },
    { id: "documentos", label: "Documentos",  count: clientDocs.length },
    { id: "agenda",     label: "Agenda",      count: clientAppts.length },
  ]

  return (
    <div className="min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Clientes</p>
            <h1 className="text-base font-semibold text-foreground leading-tight">{client.name}</h1>
          </div>
          <Link href="/admin/chat" className="text-xs font-semibold text-ink border border-border px-3 py-1.5 rounded-xl hover:bg-surface-sunken transition-colors">
            Abrir chat
          </Link>
        </div>

        {/* Client summary */}
        <div className="px-6 pb-4">
          <p className="text-sm text-muted-foreground mb-3">{client.company}</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted rounded-2xl p-3 text-center">
              <p className="font-serif text-xl font-bold text-foreground">{activeServices.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Servicios activos</p>
            </div>
            <div className={cn("rounded-2xl p-3 text-center", totalOwed > 0 ? "bg-warn-tint" : "bg-ok-tint")}>
              <p className={cn("font-serif text-base font-bold leading-none mt-0.5", totalOwed > 0 ? "text-warn-text" : "text-ok")}>
                {totalOwed > 0 ? fmt(totalOwed) : "Al día"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{totalOwed > 0 ? "Por cobrar" : "Pagos"}</p>
            </div>
            <div className={cn("rounded-2xl p-3 text-center", pendingDocs.length > 0 ? "bg-warn-tint" : "bg-muted")}>
              <p className={cn("font-serif text-xl font-bold", pendingDocs.length > 0 ? "text-warn-text" : "text-foreground")}>
                {pendingDocs.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Docs sin firma</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-3.5 w-3.5" />{client.email}
            </a>
            <span className="text-muted-foreground/30">·</span>
            <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Phone className="h-3.5 w-3.5" />{client.phone}
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 flex-1 justify-center px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "border-ink text-ink"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                  activeTab === tab.id ? "bg-surface-sunken text-ink" : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">

        {/* ── SERVICIOS ── */}
        {activeTab === "servicios" && (
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">Todos los servicios</h2>
            </div>
            {clientServices.map(s => {
              const cfg = STATUS_CONFIG[s.status]
              return (
                <Link key={s.id} href={`/admin/servicios/${s.id}`} className="block bg-card border border-border rounded-2xl p-4 hover:border-foreground/20  transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                        <FirmPill firm={s.firm} />
                        <span className="text-[10px] text-muted-foreground">{s.category}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-ink transition-colors leading-snug">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.assignedTo}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-foreground">{s.progress}%</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-ink transition-colors" />
                    </div>
                  </div>
                  {s.status !== "completado" && s.status !== "cancelado" && (
                    <>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: s.firm === "paulsen" ? "var(--paulsen)" : "var(--mia)" }} />
                      </div>
                      <p className="text-xs text-muted-foreground">→ {s.nextStep}</p>
                    </>
                  )}
                </Link>
              )
            })}
            {clientServices.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">Sin servicios</div>
            )}
          </div>
        )}

        {/* ── PAGOS ── */}
        {activeTab === "pagos" && (
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Pagos del cliente</h2>
              <Link href="/admin/pagos" className="text-xs text-ink font-medium flex items-center gap-1">
                Gestionar todos <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {clientPayments.map(p => {
              const isPaid    = p.status === "pagado"
              const isOverdue = p.status === "vencido"
              return (
                <div key={p.id} className={cn("bg-card border rounded-2xl p-4 flex items-center gap-3",
                  isOverdue ? "border-risk/30" : isPaid ? "border-border" : "border-warn/30"
                )}>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isPaid ? "bg-ok-tint" : isOverdue ? "bg-risk-tint" : "bg-warn-tint"
                  )}>
                    <CreditCard className="h-5 w-5" style={{ color: isPaid ? "var(--ok)" : isOverdue ? "var(--risk)" : "var(--warn-text)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.concept}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <FirmPill firm={p.firm} />
                      <span className="text-xs text-muted-foreground">
                        {isPaid ? `Pag. ${new Date(p.paidAt!).toLocaleDateString("es-MX")}` : `Vence: ${new Date(p.dueDate).toLocaleDateString("es-MX")}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{fmt(p.amount)}</p>
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      isPaid ? "bg-ok-tint text-ok" : isOverdue ? "bg-risk-tint text-risk" : "bg-warn-tint text-warn-text"
                    )}>
                      {isPaid ? "Pagado" : isOverdue ? "Vencido" : "Pendiente"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── DOCUMENTOS ── */}
        {activeTab === "documentos" && (
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Documentos</h2>
              <button className="text-xs font-semibold text-ink border border-border px-3 py-1.5 rounded-xl hover:bg-surface-sunken transition-colors">
                + Subir documento
              </button>
            </div>
            {clientDocs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin documentos</p>
              </div>
            )}
            {clientDocs.map(doc => {
              const dirLabel = doc.direction === "recibido" ? "Recibido" : doc.direction === "enviado" ? "Enviado" : "Pendiente de firma"
              const dirColor = doc.direction === "pendiente_firma" ? "var(--warn-text)" : doc.direction === "recibido" ? "var(--mia)" : "var(--ok)"
              return (
                <div key={doc.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: dirColor }}>{dirLabel}</span>
                      <FirmPill firm={doc.firm} />
                      <span className="text-[10px] text-muted-foreground">{doc.size}</span>
                    </div>
                  </div>
                  {doc.direction === "pendiente_firma" ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 text-warn-text" />
                      <span className="text-[10px] font-semibold text-warn-text">Sin firma</span>
                    </div>
                  ) : (
                    <button className="p-2 rounded-xl hover:bg-muted transition-colors shrink-0" aria-label="Descargar">
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── AGENDA ── */}
        {activeTab === "agenda" && (
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Citas</h2>
              <Link href="/admin/agenda" className="text-xs text-ink font-medium flex items-center gap-1">
                Ver agenda completa <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {clientAppts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin citas programadas</p>
              </div>
            )}
            {clientAppts.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {new Date(a.date).toLocaleDateString("es-MX", { month: "short" })}
                  </span>
                  <span className="text-base font-bold text-foreground leading-none">
                    {new Date(a.date).getDate()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{a.type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.time} · {a.attorney}</p>
                  <FirmPill firm={a.firm} />
                </div>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                  a.status === "confirmada" ? "bg-ok-tint text-ok" : a.status === "cancelada" ? "bg-risk-tint text-risk" : "bg-warn-tint text-warn-text"
                )}>
                  {a.status === "confirmada" ? "Confirmada" : a.status === "cancelada" ? "Cancelada" : "Por confirmar"}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
