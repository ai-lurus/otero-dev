"use client"

import { useState } from "react"
import { appointments, adminClients } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { Firm, Appointment } from "@/lib/types"

// ── Constants ─────────────────────────────────────────────────────
const DAYS_SHORT = ["D", "L", "M", "X", "J", "V", "S"]
const MONTHS     = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const SLOTS      = ["08:00","09:00","10:00","11:00","12:00","13:00","15:00","16:00","17:00","18:00"]

const FIRM_COLOR: Record<Firm, string> = { paulsen: "var(--paulsen)", mia: "var(--mia)" }
const FIRM_BG:    Record<Firm, string> = { paulsen: "var(--paulsen-light)", mia: "var(--mia-light)" }
const FIRM_LABEL: Record<Firm, string> = { paulsen: "Área Ambiental", mia: "Área Corporativa" }

const ATTORNEYS: Record<Firm, string[]> = {
  mia:     ["Dra. Ana García", "Lic. Roberto Vega"],
  paulsen: ["Ing. Carlos Mendoza", "Lic. Sofía Torres"],
}

const EVENT_TYPES = [
  "Consulta general",
  "Revisión de expediente",
  "Firma de documentos",
  "Seguimiento de trámite",
  "Due Diligence",
  "Videoconferencia urgente",
]

const INIT_AVAIL: Record<string, boolean> = {
  "08:00": true,  "09:00": false, "10:00": true,  "11:00": true,
  "12:00": false, "13:00": true,  "15:00": true,  "16:00": false,
  "17:00": true,  "18:00": false,
}

// Use today so the calendar always opens on the current week
const BASE = new Date()

function getWeekDays(pivot: Date) {
  const start = new Date(pivot)
  start.setDate(pivot.getDate() - pivot.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap",
      status === "confirmada"
        ? "bg-ok-tint text-ok"
        : "bg-warn-tint text-warn-text"
    )}>
      {status === "confirmada" ? "Confirmada" : "Pendiente"}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────
export default function AdminAgendaPage() {
  const [pivot, setPivot]         = useState(new Date(BASE))
  const [selectedDay, setSelectedDay] = useState(new Date(BASE))
  const [showMonth, setShowMonth] = useState(false)
  const [firmFilter, setFirmFilter] = useState<"all" | Firm>("all")
  const [availability, setAvailability] = useState(INIT_AVAIL)
  const [showAvail, setShowAvail] = useState(false)
  const [statuses, setStatuses]   = useState<Record<string, string>>(
    Object.fromEntries(appointments.map(a => [a.id, a.status]))
  )
  const [monthNav, setMonthNav]   = useState({ m: BASE.getMonth(), y: BASE.getFullYear() })

  // ── Local events (created in the UI) ──────────────────────────
  const [localEvents, setLocalEvents] = useState<Appointment[]>([])
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [newEvent, setNewEvent] = useState({
    clientId: "",
    type: "",
    firm: "" as Firm | "",
    attorney: "",
    time: "",
    notes: "",
  })

  const allAppointments = [...appointments, ...localEvents]

  function submitNewEvent() {
    if (!newEvent.clientId || !newEvent.type || !newEvent.firm || !newEvent.attorney || !newEvent.time) return
    const evt: Appointment = {
      id:       `le-${Date.now()}`,
      date:     `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`,
      time:     newEvent.time,
      type:     newEvent.type,
      firm:     newEvent.firm as Firm,
      attorney: newEvent.attorney,
      status:   "pendiente",
      notes:    newEvent.notes || undefined,
    }
    setLocalEvents(prev => [...prev, evt])
    setStatuses(prev => ({ ...prev, [evt.id]: "pendiente" }))
    setNewEvent({ clientId: "", type: "", firm: "", attorney: "", time: "", notes: "" })
    setShowNewEvent(false)
  }

  const weekDays = getWeekDays(pivot)

  // Mini month grid cells
  const firstDay    = new Date(monthNav.y, monthNav.m, 1).getDay()
  const daysInMonth = new Date(monthNav.y, monthNav.m + 1, 0).getDate()
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  )

  function shiftWeek(dir: 1 | -1) {
    const next = new Date(pivot)
    next.setDate(pivot.getDate() + dir * 7)
    setPivot(next)
  }

  function shiftMonth(dir: 1 | -1) {
    setMonthNav(prev => {
      const m = prev.m + dir
      if (m < 0)  return { m: 11, y: prev.y - 1 }
      if (m > 11) return { m: 0,  y: prev.y + 1 }
      return { ...prev, m }
    })
  }

  function toggleStatus(id: string) {
    setStatuses(prev => ({ ...prev, [id]: prev[id] === "confirmada" ? "pendiente" : "confirmada" }))
  }

  const dayAppts = allAppointments.filter(a =>
    (firmFilter === "all" || a.firm === firmFilter) &&
    isSameDay(new Date(a.date), selectedDay)
  )

  const weekAppts = allAppointments.filter(a =>
    (firmFilter === "all" || a.firm === firmFilter) &&
    weekDays.some(d => isSameDay(d, new Date(a.date)))
  )

  const availCount = Object.values(availability).filter(Boolean).length

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="shrink-0 bg-ink px-6 py-3.5 flex items-center justify-between gap-4 border-b border-surface/[0.07]">
        {/* Left: title + week nav */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMonth(v => !v)}
            className="flex items-center gap-1.5"
          >
            <span className="font-serif text-lg font-semibold text-surface">
              {MONTHS[pivot.getMonth()]} {pivot.getFullYear()}
            </span>
            <svg className={cn("w-4 h-4 text-surface/30 transition-transform", showMonth && "rotate-180")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-0.5">
            <button onClick={() => shiftWeek(-1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-surface/30 hover:text-surface hover:bg-surface/10 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={() => { setPivot(new Date(BASE)); setSelectedDay(new Date(BASE)) }}
              className="px-2.5 h-7 rounded-lg text-[10px] font-bold text-surface/30 hover:text-surface hover:bg-surface/10 transition-all tracking-widest">
              HOY
            </button>
            <button onClick={() => shiftWeek(1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-surface/30 hover:text-surface hover:bg-surface/10 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* Right: filters + availability */}
        <div className="flex items-center gap-2">
          {/* Firm filter pill group */}
          <div className="flex rounded-xl border border-surface/10 overflow-hidden">
            {(["all", "mia", "paulsen"] as const).map(f => (
              <button key={f} onClick={() => setFirmFilter(f)}
                className={cn("px-3 py-1.5 text-[11px] font-bold transition-all",
                  firmFilter === f ? "bg-surface/15 text-surface" : "text-surface/30 hover:text-surface/60"
                )}>
                {f === "all" ? "Todas" : f === "mia" ? "Corp." : "Amb."}
              </button>
            ))}
          </div>

          {/* Availability toggle */}
          <button
            onClick={() => setShowAvail(v => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all",
              showAvail
                ? "bg-ok/15 text-ok border-ok/30"
                : "border-surface/10 text-surface/30 hover:text-surface/60"
            )}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Disponibilidad
            <span className={cn("text-[10px] font-bold px-1.5 rounded-full",
              showAvail ? "bg-ok/20 text-ok" : "bg-surface/10 text-surface/40"
            )}>
              {availCount}/{SLOTS.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── Mini month picker (collapsible) ──────────────────── */}
      {showMonth && (
        <div className="shrink-0 bg-ink border-b border-surface/[0.07] px-6 py-4">
          <div className="w-56">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => shiftMonth(-1)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-surface/30 hover:text-surface hover:bg-surface/10 transition-all">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-xs font-semibold text-surface/50">{MONTHS[monthNav.m]} {monthNav.y}</span>
              <button onClick={() => shiftMonth(1)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-surface/30 hover:text-surface hover:bg-surface/10 transition-all">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {DAYS_SHORT.map(d => (
                <div key={d} className="text-center text-[9px] text-surface/20 font-bold py-0.5">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />
                const d = new Date(monthNav.y, monthNav.m, day)
                const isSel = isSameDay(d, selectedDay)
                const hasA  = appointments.some(a => isSameDay(new Date(a.date), d))
                return (
                  <button key={day}
                    onClick={() => { setSelectedDay(d); setPivot(d); setShowMonth(false) }}
                    className={cn("flex flex-col items-center rounded-lg py-0.5 text-[11px] transition-all",
                      isSel ? "bg-surface-raised text-ink font-bold" : "text-surface/50 hover:bg-surface/10"
                    )}>
                    {day}
                    {hasA && !isSel && <span className="w-1 h-1 rounded-full bg-ok mt-0.5" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Week strip ───────────────────────────────────────── */}
      <div className="shrink-0 bg-ink border-b border-surface/[0.07] px-6">
        <div className="grid grid-cols-7">
          {weekDays.map((d, i) => {
            const isSel  = isSameDay(d, selectedDay)
            const isBase = isSameDay(d, BASE)
            const hasA   = allAppointments.some(a =>
              (firmFilter === "all" || a.firm === firmFilter) &&
              isSameDay(new Date(a.date), d)
            )
            return (
              <button key={i} onClick={() => setSelectedDay(d)}
                className={cn("flex flex-col items-center gap-1 py-3 mx-0.5 rounded-xl transition-all",
                  isSel ? "bg-surface-raised" : "hover:bg-surface/8"
                )}>
                <span className={cn("text-[9px] font-bold uppercase tracking-widest",
                  isSel ? "text-ink" : "text-surface/25"
                )}>
                  {DAYS_SHORT[i]}
                </span>
                <span className={cn("text-base font-bold leading-none",
                  isSel ? "text-ink" : isBase ? "text-surface" : "text-surface/55"
                )}>
                  {d.getDate()}
                </span>
                {hasA
                  ? <span className={cn("w-1.5 h-1.5 rounded-full", isSel ? "bg-ink" : "bg-ok")} />
                  : <span className="w-1.5 h-1.5" />
                }
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Day detail */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Heading */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                {selectedDay.toLocaleDateString("es-MX", { weekday: "long" })}
              </p>
              <h2 className="font-serif text-2xl font-semibold text-foreground leading-tight">
                {selectedDay.getDate()} de {MONTHS[selectedDay.getMonth()]}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-xl font-semibold">
                {dayAppts.length} {dayAppts.length === 1 ? "cita" : "citas"}
              </span>
              <button
                onClick={() => setShowNewEvent(true)}
                className="flex items-center gap-1.5 bg-ink hover:bg-ink/90 text-surface text-xs font-bold px-4 py-2 rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nuevo evento
              </button>
            </div>
          </div>

          {/* Appointment cards for the selected day */}
          {dayAppts.length > 0 ? (
            <div className="space-y-3 mb-8">
              {dayAppts.map(a => {
                const firm   = a.firm as Firm
                const status = statuses[a.id] ?? a.status
                return (
                  <div key={a.id}
                    className="flex gap-0 bg-card border border-border rounded-2xl overflow-hidden hover:border-foreground/10 transition-colors">
                    {/* Left accent bar */}
                    <div className="w-1 shrink-0" style={{ background: FIRM_COLOR[firm] }} />
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Firm label */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: FIRM_COLOR[firm] }} />
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: FIRM_COLOR[firm] }}>
                              {FIRM_LABEL[firm]}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">{a.type}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {a.time}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                              {a.attorney}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                              </svg>
                              {a.type}
                            </span>
                          </div>
                        </div>
                        {/* Status + action */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <StatusBadge status={status} />
                          <button
                            onClick={() => toggleStatus(a.id)}
                            className={cn(
                              "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all",
                              status === "confirmada"
                                ? "border-border text-muted-foreground hover:border-risk/30 hover:text-risk hover:bg-risk-tint"
                                : "border-ok/30 text-ok bg-ok-tint hover:bg-ok/20"
                            )}
                          >
                            {status === "confirmada" ? "Cancelar" : "Confirmar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sin citas este dia</p>
                <p className="text-xs text-muted-foreground mt-1">Selecciona otro dia en el calendario</p>
              </div>
            </div>
          )}

          {/* All this-week appointments */}
          {weekAppts.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Esta semana</p>
              <div className="space-y-2">
                {weekAppts.map(a => {
                  const firm   = a.firm as Firm
                  const status = statuses[a.id] ?? a.status
                  const d = new Date(a.date)
                  return (
                    <div key={a.id}
                      className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-foreground/10 transition-colors cursor-pointer"
                      onClick={() => setSelectedDay(d)}>
                      <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center shrink-0"
                        style={{ background: FIRM_BG[firm] }}>
                        <span className="text-[8px] font-bold uppercase" style={{ color: FIRM_COLOR[firm] }}>
                          {d.toLocaleDateString("es-MX", { month: "short" })}
                        </span>
                        <span className="text-sm font-bold leading-none" style={{ color: FIRM_COLOR[firm] }}>
                          {d.getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{a.type}</p>
                        <p className="text-[11px] text-muted-foreground">{a.time} · {a.attorney}</p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── New Event Modal ──────────────────────────────── */}
        {showNewEvent && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-ink/50" onClick={() => setShowNewEvent(false)} />
            <div className="relative bg-background rounded-t-3xl md:rounded-2xl w-full md:max-w-lg p-6 pb-8 max-h-[90vh] overflow-y-auto ">
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Nuevo evento</p>
                  <h3 className="font-serif text-xl font-semibold text-foreground">
                    {selectedDay.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                  </h3>
                </div>
                <button onClick={() => setShowNewEvent(false)}
                  className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* Client */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Cliente</label>
                  <select
                    value={newEvent.clientId}
                    onChange={e => setNewEvent(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ink/20"
                  >
                    <option value="">Seleccionar cliente...</option>
                    {adminClients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                    ))}
                  </select>
                </div>

                {/* Firm */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Firma</label>
                  <div className="flex gap-2">
                    {(["mia", "paulsen"] as Firm[]).map(f => (
                      <button key={f}
                        onClick={() => setNewEvent(prev => ({ ...prev, firm: f, attorney: "" }))}
                        className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2",
                          newEvent.firm === f ? "text-surface border-transparent" : "bg-card border-border text-foreground"
                        )}
                        style={newEvent.firm === f ? { background: FIRM_COLOR[f] } : undefined}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: newEvent.firm === f ? "white" : FIRM_COLOR[f] }} />
                        {f === "mia" ? "Corporativo" : "Ambiental"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attorney */}
                {newEvent.firm && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Abogado responsable</label>
                    <div className="flex flex-col gap-1.5">
                      {ATTORNEYS[newEvent.firm].map(att => (
                        <button key={att}
                          onClick={() => setNewEvent(prev => ({ ...prev, attorney: att }))}
                          className={cn("text-left px-4 py-2.5 rounded-xl text-sm border transition-all",
                            newEvent.attorney === att
                              ? "font-semibold border-transparent"
                              : "bg-card border-border text-foreground hover:border-foreground/20"
                          )}
                          style={newEvent.attorney === att ? { background: FIRM_BG[newEvent.firm as Firm], color: FIRM_COLOR[newEvent.firm as Firm], borderColor: FIRM_COLOR[newEvent.firm as Firm] + "33" } : undefined}
                        >
                          {att}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event type */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Tipo de reunión</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EVENT_TYPES.map(t => (
                      <button key={t}
                        onClick={() => setNewEvent(prev => ({ ...prev, type: t }))}
                        className={cn("text-left px-3 py-2.5 rounded-xl text-xs border transition-all font-medium",
                          newEvent.type === t
                            ? "bg-surface-sunken text-ink border-border font-semibold"
                            : "bg-card border-border text-foreground hover:border-foreground/20"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time slot */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Horario</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {SLOTS.map(slot => {
                      const occupied = !availability[slot]
                      return (
                        <button key={slot}
                          disabled={occupied}
                          onClick={() => setNewEvent(prev => ({ ...prev, time: slot }))}
                          className={cn("py-2 rounded-xl text-xs font-medium border transition-all",
                            occupied && "opacity-30 cursor-not-allowed border-border text-muted-foreground",
                            newEvent.time === slot && !occupied && "bg-ink text-surface border-ink",
                            newEvent.time !== slot && !occupied && "bg-card border-border text-foreground hover:border-foreground/30"
                          )}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Notas (opcional)</label>
                  <textarea
                    rows={2}
                    value={newEvent.notes}
                    onChange={e => setNewEvent(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Instrucciones, enlace de videollamada, documentos requeridos..."
                    className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ink/20 resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={submitNewEvent}
                  disabled={!newEvent.clientId || !newEvent.type || !newEvent.firm || !newEvent.attorney || !newEvent.time}
                  className="w-full bg-ink text-surface text-sm font-bold py-3 rounded-xl transition-all hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                >
                  Crear evento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Availability right panel ─────────────────────── */}
        {showAvail && (
          <div className="w-60 shrink-0 border-l border-border bg-card overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-foreground">Disponibilidad</h3>
                <button onClick={() => setShowAvail(false)}
                  className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mb-1">
                {selectedDay.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <p className="text-[10px] text-muted-foreground/70 mb-4 leading-relaxed">
                Los slots activos son visibles al cliente al agendar citas.
              </p>

              {/* Progress bar */}
              <div className="mb-4 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-muted-foreground font-medium">Disponibles</span>
                  <span className="font-bold text-foreground">{availCount}/{SLOTS.length}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-ok rounded-full transition-all duration-300"
                    style={{ width: `${(availCount / SLOTS.length) * 100}%` }} />
                </div>
              </div>

              {/* Slot toggles */}
              <div className="space-y-1.5">
                {SLOTS.map(slot => {
                  const isAvail  = availability[slot]
                  const hasAppt  = appointments.some(a =>
                    a.time === slot && isSameDay(new Date(a.date), selectedDay)
                  )
                  return (
                    <div key={slot} className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 border transition-all",
                      hasAppt
                        ? "bg-surface-sunken border-border"
                        : isAvail
                          ? "bg-ok-tint border-ok/20"
                          : "bg-muted/40 border-border"
                    )}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                          hasAppt ? "bg-ink" : isAvail ? "bg-ok" : "bg-muted-foreground/30"
                        )} />
                        <span className={cn("text-xs font-semibold tabular-nums",
                          hasAppt ? "text-ink" : isAvail ? "text-ok" : "text-muted-foreground"
                        )}>
                          {slot}
                        </span>
                      </div>
                      {hasAppt ? (
                        <span className="text-[10px] font-bold text-ink/50">Ocupado</span>
                      ) : (
                        <button
                          onClick={() => setAvailability(prev => ({ ...prev, [slot]: !prev[slot] }))}
                          className={cn(
                            "relative w-9 h-5 rounded-full transition-colors duration-200",
                            isAvail ? "bg-ok" : "bg-muted-foreground/20"
                          )}
                          aria-label={isAvail ? "Bloquear" : "Activar"}
                        >
                          <span className={cn(
                            "absolute top-0.5 w-4 h-4 bg-surface-raised rounded-full  transition-all duration-200",
                            isAvail ? "left-4" : "left-0.5"
                          )} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
