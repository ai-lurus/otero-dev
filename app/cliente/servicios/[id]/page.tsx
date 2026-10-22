"use client"

import { notFound } from "next/navigation"
import Link from "next/link"
import { useState, use } from "react"
import { services, clientDocuments, payments, timelineEvents, serviceTasks } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ArrowLeft, CheckCircle2, Clock, Circle, FileText, CreditCard, Download, AlertTriangle } from "lucide-react"
import type { Firm } from "@/lib/types"

const STATUS_CONFIG = {
  solicitud:  { label: "Solicitud",   color: "#6B7280", bg: "#F3F4F6" },
  en_proceso: { label: "En proceso",  color: "#1C2B4A", bg: "#EEF2F8" },
  revision:   { label: "En revisión", color: "#D97706", bg: "#FFFBEB" },
  completado: { label: "Completado",  color: "#16A34A", bg: "#F0FDF4" },
  cancelado:  { label: "Cancelado",   color: "#DC2626", bg: "#FEF2F2" },
}

function FirmBadge({ firm }: { firm: Firm }) {
  return (
    <span className={cn(
      "text-[10px] font-bold px-2 py-0.5 rounded-full",
      firm === "paulsen" ? "bg-[#EAF2EC] text-[#2D5A3D]" : "bg-[#EEF2F8] text-[#1C2B4A]"
    )}>
      {firm === "paulsen" ? "Área Ambiental" : "Área Corporativa"}
    </span>
  )
}

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString("es-MX", { maximumFractionDigits: 0 })} MXN`
}

type Tab = "progreso" | "documentos" | "pagos"

export default function ClientServiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const service = services.find(s => s.id === id)
  if (!service) notFound()

  const [activeTab, setActiveTab] = useState<Tab>("progreso")

  const statusCfg   = STATUS_CONFIG[service.status]
  const tasks       = serviceTasks.filter(t => t.serviceId === service.id)
  const docs        = clientDocuments.filter(d => d.serviceId === service.id)
  const svcPayments = payments.filter(p => p.serviceId === service.id)
  const timeline    = timelineEvents.filter(e => e.serviceId === service.id).sort((a, b) => b.date.localeCompare(a.date))

  const completedTasks = tasks.filter(t => t.status === "completada").length
  const pendingPayment = svcPayments.find(p => p.status === "pendiente" || p.status === "vencido")

  const TABS: { id: Tab; label: string }[] = [
    { id: "progreso",   label: "Progreso" },
    { id: "documentos", label: `Documentos${docs.length > 0 ? ` (${docs.length})` : ""}` },
    { id: "pagos",      label: `Pagos${svcPayments.length > 0 ? ` (${svcPayments.length})` : ""}` },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="px-5 py-3 flex items-center gap-3">
          <Link href="/cliente/servicios" className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-muted transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground">Mis servicios</p>
            <h1 className="text-sm font-semibold text-foreground leading-tight truncate">{service.title}</h1>
          </div>
        </div>

        {/* Status + progress */}
        <div className="px-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: statusCfg.color, background: statusCfg.bg }}>
                {statusCfg.label}
              </span>
              <FirmBadge firm={service.firm} />
            </div>
            <span className="text-xs font-bold text-foreground">{service.progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${service.progress}%`, background: service.firm === "paulsen" ? "#2D5A3D" : "#1C2B4A" }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {completedTasks}/{tasks.length} pasos completados
          </p>
        </div>

        {/* Pending payment alert */}
        {pendingPayment && (
          <div className="mx-5 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 flex-1">Pago pendiente: <strong>{fmt(pendingPayment.amount)}</strong></p>
            <button onClick={() => setActiveTab("pagos")} className="text-[10px] font-semibold text-amber-700 underline">
              Ver
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-t border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 text-xs font-semibold py-3 border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-[#1C2B4A] text-[#1C2B4A]"
                  : "border-transparent text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-4 space-y-3">

        {/* ── PROGRESO ── */}
        {activeTab === "progreso" && (
          <>
            {/* Next step */}
            {service.nextStep && service.status !== "completado" && (
              <div className="rounded-2xl border border-[#1C2B4A]/20 bg-[#EEF2F8] p-4 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#1C2B4A] flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1C2B4A] mb-0.5">Siguiente paso</p>
                  <p className="text-xs text-[#1C2B4A]/80">{service.nextStep}</p>
                </div>
              </div>
            )}

            {/* Tasks as read-only steps */}
            <div className="space-y-2">
              {tasks.map((task, i) => {
                const isDone = task.status === "completada"
                const isActive = task.status === "en_progreso"
                return (
                  <div key={task.id} className={cn("flex items-start gap-3 rounded-2xl border p-4",
                    isDone ? "border-border bg-card opacity-80" : isActive ? "border-[#1C2B4A]/30 bg-[#EEF2F8]" : "border-border bg-card"
                  )}>
                    <div className="shrink-0 mt-0.5">
                      {isDone
                        ? <CheckCircle2 className="h-5 w-5" style={{ color: "#16A34A" }} />
                        : isActive
                        ? <Clock className="h-5 w-5 text-[#D97706]" />
                        : <Circle className="h-5 w-5 text-muted-foreground/30" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", isDone ? "line-through text-muted-foreground" : "text-foreground")}>
                        {task.title}
                      </p>
                      {isActive && task.note && (
                        <p className="text-xs text-[#D97706] mt-1">{task.note}</p>
                      )}
                      {isDone && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Completado</p>
                      )}
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 shrink-0">
                        Activo
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Timeline preview */}
            {timeline.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Últimas actualizaciones</p>
                <div className="space-y-2">
                  {timeline.slice(0, 3).map(event => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: event.firm === "paulsen" ? "#2D5A3D" : "#1C2B4A" }} />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">{event.action}</p>
                        {event.detail && <p className="text-[10px] text-muted-foreground">{event.detail}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {new Date(event.date).toLocaleDateString("es-MX", { day: "numeric", month: "long" })} · {event.actor}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <Link href="/cliente/agenda" className="flex items-center justify-center gap-2 w-full text-center text-xs font-semibold bg-[#1C2B4A] text-white rounded-2xl py-3 hover:bg-[#1C2B4A]/90 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Agendar cita sobre este servicio
              </Link>
              <Link href="/cliente/chat" className="block w-full text-center text-xs font-semibold text-[#1C2B4A] border border-[#1C2B4A]/20 rounded-2xl py-3 hover:bg-[#EEF2F8] transition-colors">
                Preguntarle al despacho sobre este servicio
              </Link>
            </div>
          </>
        )}

        {/* ── DOCUMENTOS ── */}
        {activeTab === "documentos" && (
          <>
            {docs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin documentos en este servicio</p>
                <p className="text-xs text-muted-foreground/60 mt-1">El despacho compartirá documentos aqui cuando estén listos</p>
              </div>
            )}
            {docs.map(doc => {
              const dirLabel = doc.direction === "recibido" ? "Del despacho" : doc.direction === "enviado" ? "Enviado" : "Requiere tu firma"
              const dirColor = doc.direction === "pendiente_firma" ? "#D97706" : doc.direction === "recibido" ? "#1C2B4A" : "#16A34A"
              return (
                <div key={doc.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: dirColor }}>{dirLabel}</span>
                      <span className="text-[10px] text-muted-foreground">{doc.size}</span>
                    </div>
                  </div>
                  {doc.direction === "pendiente_firma" ? (
                    <button className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-xl">
                      Firmar
                    </button>
                  ) : (
                    <button className="p-2 rounded-xl hover:bg-muted transition-colors" aria-label="Descargar">
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ── PAGOS ── */}
        {activeTab === "pagos" && (
          <>
            {svcPayments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Sin pagos en este servicio</p>
              </div>
            )}
            {svcPayments.map(p => {
              const isPaid    = p.status === "pagado"
              const isOverdue = p.status === "vencido"
              return (
                <div key={p.id} className={cn("bg-card border rounded-2xl p-4",
                  isOverdue ? "border-red-200" : isPaid ? "border-border" : "border-amber-200"
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{p.concept}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isPaid
                          ? `Pagado el ${new Date(p.paidAt!).toLocaleDateString("es-MX")}`
                          : `Vence: ${new Date(p.dueDate).toLocaleDateString("es-MX")}`
                        }
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-foreground">{fmt(p.amount)}</p>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                        isPaid ? "bg-[#F0FDF4] text-[#16A34A]" : isOverdue ? "bg-[#FEF2F2] text-[#DC2626]" : "bg-[#FFFBEB] text-[#D97706]"
                      )}>
                        {isPaid ? "Pagado" : isOverdue ? "Vencido" : "Pendiente"}
                      </span>
                    </div>
                  </div>
                  {!isPaid && (
                    <Link href="/cliente/pagos" className="mt-3 block text-center text-xs font-semibold bg-[#1C2B4A] text-white py-2.5 rounded-xl">
                      Ir a pagar
                    </Link>
                  )}
                </div>
              )
            })}
          </>
        )}

      </div>
    </div>
  )
}
