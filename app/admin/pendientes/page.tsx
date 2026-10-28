"use client"

import { useState } from "react"
import Link from "next/link"
import { adminPending } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { Firm } from "@/lib/types"

const TYPE_HREF: Record<string, string> = {
  mensaje:   "/admin/chat",
  documento: "/admin/documentos",
  servicio:  "/admin/servicios",
  pago:      "/admin/pagos",
  cita:      "/admin/agenda",
}

const PRIORITY_CONFIG = {
  alta:  { label: "Urgente", color: "var(--risk)", bg: "var(--risk-tint)" },
  media: { label: "Medio",   color: "var(--warn-text)", bg: "var(--warn-tint)" },
  baja:  { label: "Normal",  color: "var(--ink-muted)", bg: "var(--surface-sunken)" },
}

const TYPE_PATH: Record<string, string> = {
  mensaje:   "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  documento: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  servicio:  "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  pago:      "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  cita:      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
}

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

export default function PendientesPage() {
  const [firmFilter, setFirmFilter] = useState<"all" | Firm>("all")
  const [done, setDone] = useState<string[]>([])

  const filtered = adminPending
    .filter(p => !done.includes(p.id))
    .filter(p => firmFilter === "all" || p.firm === firmFilter)
    .sort((a, b) => {
      const order = { alta: 0, media: 1, baja: 2 }
      return order[a.priority] - order[b.priority]
    })

  const urgentes = adminPending.filter(p => p.priority === "alta"  && !done.includes(p.id)).length
  const medios   = adminPending.filter(p => p.priority === "media" && !done.includes(p.id)).length
  const normales = adminPending.filter(p => p.priority === "baja"  && !done.includes(p.id)).length

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-foreground">Pendientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acciones que requieren atención del despacho</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Urgentes", count: urgentes, color: "var(--risk)" },
          { label: "Medios",   count: medios,   color: "var(--warn-text)" },
          { label: "Normales", count: normales, color: "var(--ink-muted)" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center ">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "mia", "paulsen"] as const).map(f => (
          <button key={f} onClick={() => setFirmFilter(f)}
            className={cn("text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all",
              firmFilter === f ? "bg-mia text-surface border-mia" : "bg-card border-border text-muted-foreground"
            )}>
            {f === "all" ? "Todos" : f === "paulsen" ? "Ambiental" : "Corporativo"}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-ok-tint flex items-center justify-center">
            <svg className="w-6 h-6 text-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground">Bandeja al día</p>
          <p className="text-xs text-muted-foreground">No hay pendientes en esta vista</p>
        </div>
      )}

      <div className="flex flex-col gap-2.5 max-w-2xl">
        {filtered.map(item => {
          const pc = PRIORITY_CONFIG[item.priority]
          return (
            <div key={item.id} className={cn("bg-card border rounded-2xl p-4 ",
              item.priority === "alta" ? "border-risk/25" : item.priority === "media" ? "border-warn-text/25" : "border-border"
            )}>
              <div className="flex items-start gap-3">
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                  item.priority === "alta" ? "bg-risk-tint" : item.priority === "media" ? "bg-warn-tint" : "bg-muted"
                )}>
                  <svg style={{ color: pc.color, width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_PATH[item.type]} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: pc.color, background: pc.bg }}>{pc.label}</span>
                    <FirmPill firm={item.firm} />
                  </div>
                  <p className="text-sm font-medium text-foreground leading-snug">{item.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.client}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Link href={TYPE_HREF[item.type] ?? "/admin"} className="flex-1 bg-ink text-surface text-xs font-semibold py-2 rounded-xl active:scale-95 transition-transform text-center">Atender</Link>
                <button onClick={() => setDone(p => [...p, item.id])} className="flex-1 border border-border text-muted-foreground text-xs font-medium py-2 rounded-xl active:scale-95 transition-transform">Descartar</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
