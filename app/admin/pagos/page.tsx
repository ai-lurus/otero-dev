"use client"

import { useState } from "react"
import { payments as initialPayments, adminClients, services } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { Firm, Payment } from "@/lib/types"

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

const fmt = (c: number) => `$${(c / 100).toLocaleString("es-MX", { minimumFractionDigits: 0 })} MXN`

interface NewInvoice {
  clientId: string
  firm: Firm | ""
  concept: string
  amount: string
  dueDate: string
  serviceId: string
}

export default function PagosPage() {
  const [firmFilter, setFirmFilter] = useState<"all" | Firm>("all")
  const [markedPaid, setMarkedPaid] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [sentInvoices, setSentInvoices] = useState<Payment[]>([])
  const [newInvoice, setNewInvoice] = useState<NewInvoice>({
    clientId: "", firm: "", concept: "", amount: "", dueDate: "", serviceId: "",
  })
  const [sentConfirm, setSentConfirm] = useState<string | null>(null)

  const allPayments: Payment[] = [...initialPayments, ...sentInvoices]
  const filtered = allPayments.filter(p => firmFilter === "all" || p.firm === firmFilter)
  const pending  = filtered.filter(p => (p.status === "pendiente" || p.status === "vencido") && !markedPaid.includes(p.id))
  const done     = filtered.filter(p => p.status === "pagado" || markedPaid.includes(p.id))
  const totalPending = pending.reduce((s, p) => s + p.amount, 0)

  function sendInvoice() {
    if (!newInvoice.clientId || !newInvoice.concept || !newInvoice.amount || !newInvoice.dueDate || !newInvoice.firm) return
    const inv: Payment = {
      id: `inv-${Date.now()}`,
      concept: newInvoice.concept,
      amount: Math.round(parseFloat(newInvoice.amount) * 100),
      status: "pendiente",
      firm: newInvoice.firm as Firm,
      dueDate: newInvoice.dueDate,
      serviceId: newInvoice.serviceId || undefined,
    }
    setSentInvoices(prev => [...prev, inv])
    setSentConfirm(inv.id)
    setShowModal(false)
    setNewInvoice({ clientId: "", firm: "", concept: "", amount: "", dueDate: "", serviceId: "" })
    setTimeout(() => setSentConfirm(null), 3000)
  }

  const selectedClientServices = newInvoice.clientId
    ? services.filter(s => {
        const client = adminClients.find(c => c.id === newInvoice.clientId)
        return client && (newInvoice.firm === "" || s.firm === newInvoice.firm)
      })
    : []

  return (
    <div className="min-h-full p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground">Pagos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Facturas y cobros de clientes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-ink text-surface text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-ink/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva factura
        </button>
      </div>

      {/* Sent confirm toast */}
      {sentConfirm && (
        <div className="mb-4 flex items-center gap-3 bg-ok-tint border border-ok/30 rounded-2xl px-4 py-3">
          <svg className="w-5 h-5 text-ok shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
          <p className="text-sm font-semibold text-ok">Factura enviada al cliente exitosamente</p>
        </div>
      )}

      {/* Firm filters + summary */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1.5">
          {(["all", "mia", "paulsen"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFirmFilter(f)}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all",
                firmFilter === f ? "bg-mia text-surface border-mia" : "bg-card border-border text-muted-foreground"
              )}
            >
              {f === "all" ? "Todos" : f === "paulsen" ? "Ambiental" : "Corporativo"}
            </button>
          ))}
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-2 bg-warn-tint border border-warn/30 rounded-xl px-4 py-2">
            <svg className="w-4 h-4 text-warn-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-warn-text">{fmt(totalPending)}</p>
              <p className="text-[10px] text-warn-text/70">{pending.length} pendiente{pending.length > 1 ? "s" : ""}</p>
            </div>
          </div>
        )}
      </div>

      {/* Invoice list */}
      <div className="flex flex-col gap-2.5 max-w-3xl">
        {[...pending, ...done].map(p => {
          const isPaid   = p.status === "pagado" || markedPaid.includes(p.id)
          const isOverdue = p.status === "vencido" && !markedPaid.includes(p.id)
          const client = adminClients.find(c =>
            services.find(s => s.id === p.serviceId && c.activeServices > 0)
          )
          return (
            <div
              key={p.id}
              className={cn(
                "bg-card border rounded-2xl p-4 ",
                isOverdue ? "border-risk/30" : isPaid ? "border-border" : "border-warn/70"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full",
                      isPaid ? "bg-ok-tint text-ok"
                        : isOverdue ? "bg-risk-tint text-risk"
                        : "bg-warn-tint text-warn-text"
                    )}>
                      {isPaid ? "Pagado" : isOverdue ? "Vencido" : "Pendiente"}
                    </span>
                    <FirmPill firm={p.firm} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{p.concept}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <p className="text-xs text-muted-foreground">
                      {isPaid
                        ? `Pagado ${p.paidAt ? new Date(p.paidAt).toLocaleDateString("es-MX") : "recientemente"}`
                        : `Vence ${new Date(p.dueDate).toLocaleDateString("es-MX")}`
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-foreground">{fmt(p.amount)}</p>
                </div>
              </div>

              {!isPaid && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setMarkedPaid(prev => [...prev, p.id])}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-ink text-surface text-xs font-semibold py-2.5 rounded-xl hover:bg-ink/90 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Marcar pagado
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 border border-border text-xs font-medium py-2.5 rounded-xl hover:bg-muted transition-colors">
                    <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    Reenviar cobro
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <svg className="w-10 h-10 text-muted-foreground mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            <p className="text-sm text-muted-foreground">Sin facturas para este filtro</p>
          </div>
        )}
      </div>

      {/* ── New Invoice Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-background rounded-t-3xl sm:rounded-2xl  w-full max-w-lg mx-auto sm:m-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 bg-background flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
              <div>
                <h2 className="font-serif text-xl font-semibold text-foreground">Nueva factura</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Crear y enviar cobro al cliente</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Client */}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">Cliente *</label>
                <select
                  value={newInvoice.clientId}
                  onChange={e => setNewInvoice(v => ({ ...v, clientId: e.target.value }))}
                  className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-border appearance-none"
                >
                  <option value="">Selecciona un cliente</option>
                  {adminClients.map(c => (
                    <option key={c.id} value={c.id}>{c.company} — {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Firm */}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">Firma *</label>
                <div className="flex gap-2">
                  {(["mia", "paulsen"] as Firm[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setNewInvoice(v => ({ ...v, firm: f }))}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all",
                        newInvoice.firm === f
                          ? f === "paulsen" ? "bg-paulsen text-surface border-paulsen" : "bg-mia text-surface border-mia"
                          : "bg-card border-border text-muted-foreground hover:border-foreground/20"
                      )}
                    >
                      {f === "paulsen" ? "Área Ambiental" : "Área Corporativa"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concept */}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">Concepto *</label>
                <input
                  type="text"
                  value={newInvoice.concept}
                  onChange={e => setNewInvoice(v => ({ ...v, concept: e.target.value }))}
                  placeholder="Ej. Honorarios — Due Diligence Tulum"
                  className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-border placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Amount + Due date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">Monto MXN *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={newInvoice.amount}
                      onChange={e => setNewInvoice(v => ({ ...v, amount: e.target.value }))}
                      placeholder="25,000"
                      className="w-full text-sm bg-muted rounded-xl pl-7 pr-3 py-2.5 outline-none border border-transparent focus:border-border placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">Vencimiento *</label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={e => setNewInvoice(v => ({ ...v, dueDate: e.target.value }))}
                    className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-border"
                  />
                </div>
              </div>

              {/* Optional service link */}
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5 block">
                  Vincular a servicio <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <select
                  value={newInvoice.serviceId}
                  onChange={e => setNewInvoice(v => ({ ...v, serviceId: e.target.value }))}
                  className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-border appearance-none"
                >
                  <option value="">Sin vincular</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              {/* Preview amount */}
              {newInvoice.amount && !isNaN(parseFloat(newInvoice.amount)) && (
                <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total a cobrar</span>
                  <span className="text-base font-bold text-foreground">
                    ${parseFloat(newInvoice.amount).toLocaleString("es-MX")} MXN
                  </span>
                </div>
              )}

              <button
                onClick={sendInvoice}
                disabled={!newInvoice.clientId || !newInvoice.concept || !newInvoice.amount || !newInvoice.dueDate || !newInvoice.firm}
                className="w-full bg-ink text-surface font-semibold py-3.5 rounded-2xl disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Enviar factura al cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
