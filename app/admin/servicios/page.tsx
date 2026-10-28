"use client"

import { useState } from "react"
import Link from "next/link"
import { services as initialServices } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { Firm, Service, ServiceStatus } from "@/lib/types"

function FirmPill({ firm }: { firm: Firm }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full",
      firm === "paulsen" ? "bg-paulsen-light text-paulsen" : "bg-mia-light text-mia"
    )}>
      {firm === "paulsen" ? "Ambiental" : "Corporativo"}
    </span>
  )
}

const STATUS_COLS: ServiceStatus[] = ["solicitud", "en_proceso", "revision", "completado"]

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; bg: string; dot: string }> = {
  solicitud:  { label: "Solicitudes",  color: "var(--ink-muted)", bg: "var(--surface-sunken)", dot: "var(--border-strong)" },
  en_proceso: { label: "En proceso",   color: "var(--ink)", bg: "var(--surface-sunken)", dot: "var(--ink)" },
  revision:   { label: "En revision",  color: "var(--warn-text)", bg: "var(--warn-tint)", dot: "var(--warn)" },
  completado: { label: "Completados",  color: "var(--ok)", bg: "var(--ok-tint)", dot: "var(--ok)" },
  cancelado:  { label: "Cancelados",   color: "var(--risk)", bg: "var(--risk-tint)", dot: "var(--risk)" },
}

export default function ServiciosPage() {
  const [firmFilter, setFirmFilter] = useState<"all" | Firm>("all")
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>(
    Object.fromEntries(initialServices.map(s => [s.id, s.status]))
  )

  const allServices: Service[] = initialServices.map(s => ({ ...s, status: statuses[s.id] ?? s.status }))
  const filtered = allServices.filter(s => firmFilter === "all" || s.firm === firmFilter)

  function acceptService(id: string) {
    setStatuses(prev => ({ ...prev, [id]: "en_proceso" }))
  }

  return (
    <div className="min-h-full p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Servicios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} expediente{filtered.length !== 1 ? "s" : ""} · {filtered.filter(s => s.status !== "completado" && s.status !== "cancelado").length} activos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {(["all", "mia", "paulsen"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFirmFilter(f)}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all",
                  firmFilter === f
                    ? f === "paulsen" ? "bg-paulsen text-surface border-paulsen"
                      : f === "mia" ? "bg-mia text-surface border-mia"
                      : "bg-foreground text-background border-foreground"
                    : "bg-card border-border text-muted-foreground hover:border-foreground/20"
                )}
              >
                {f === "all" ? "Todos" : f === "paulsen" ? "Ambiental" : "Corporativo"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {STATUS_COLS.map(col => {
          const colServices = filtered.filter(s => s.status === col)
          const cfg = STATUS_CONFIG[col]
          return (
            <div key={col} className="flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex-1">{cfg.label}</h3>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {colServices.length}
                </span>
              </div>

              {colServices.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                  Sin servicios
                </div>
              )}

              {colServices.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-2xl   hover:border-foreground/15 transition-all group overflow-hidden">
                  {/* Firm top bar */}
                  <div className="h-0.5" style={{ background: s.firm === "paulsen" ? "var(--paulsen)" : "var(--mia)" }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <FirmPill firm={s.firm} />
                          <span className="text-[9px] text-muted-foreground">{s.category}</span>
                        </div>
                        <Link href={`/admin/servicios/${s.id}`}>
                          <p className="text-sm font-semibold text-foreground leading-snug group-hover:text-ink transition-colors">
                            {s.title}
                          </p>
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.assignedTo}</p>
                      </div>
                      <span className="text-xs font-bold text-foreground tabular-nums shrink-0">{s.progress}%</span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${s.progress}%`, background: s.firm === "paulsen" ? "var(--paulsen)" : "var(--mia)" }}
                      />
                    </div>

                    {/* Next step */}
                    <div className="flex items-start gap-1.5 mb-3">
                      <svg className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <p className="text-xs text-muted-foreground leading-snug">{s.nextStep}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/servicios/${s.id}`}
                        className="flex-1 border border-border text-xs font-medium py-2 rounded-xl text-center hover:bg-muted transition-colors"
                      >
                        Ver detalle
                      </Link>
                      {col === "solicitud" ? (
                        <button
                          onClick={() => acceptService(s.id)}
                          className="flex-1 bg-ink text-surface text-xs font-semibold py-2 rounded-xl hover:bg-ink/90 transition-colors"
                        >
                          Aceptar
                        </button>
                      ) : col === "en_proceso" ? (
                        <Link
                          href="/admin/chat"
                          className="flex-1 border border-border text-xs font-medium py-2 rounded-xl text-center hover:bg-muted transition-colors flex items-center justify-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                          </svg>
                          Chat
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
