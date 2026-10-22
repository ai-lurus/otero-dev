'use client'

import { useState } from 'react'
import Link from 'next/link'
import { adminClients } from '@/lib/data'
import { cn } from '@/lib/utils'
import { ChevronRight, Search, Mail, Phone } from 'lucide-react'
import type { Client, Firm } from '@/lib/types'

function FirmPill({ firm }: { firm: Firm }) {
  return (
    <span className={cn(
      'text-[10px] font-bold px-2 py-0.5 rounded-full',
      firm === 'paulsen' ? 'bg-[#EAF2EC] text-[#2D5A3D]' : 'bg-[#EEF2F8] text-[#1C2B4A]'
    )}>
      {firm === 'paulsen' ? 'Ambiental' : 'Corporativo'}
    </span>
  )
}

function paymentBadge(pending: number) {
  if (pending >= 2) return 'bg-red-50 text-red-700 border border-red-200'
  if (pending === 1) return 'bg-amber-50 text-amber-700 border border-amber-200'
  return 'bg-green-50 text-green-700 border border-green-200'
}

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Client | null>(null)

  const filtered = adminClients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-full p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-foreground">
          Gestión de Clientes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {adminClients.length} clientes registrados
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Table */}
        <div className="flex-1">
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente o empresa..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/60">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cliente</th>
                  <th className="hidden px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">Empresa</th>
                  <th className="hidden px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">Servicios</th>
                  <th className="hidden px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">Pagos pend.</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Firmas</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                  <th className="w-8 px-2 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => setSelected(selected?.id === client.id ? null : client)}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-secondary/40',
                      selected?.id === client.id && 'bg-secondary/60'
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{client.name}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                      {client.company}
                    </td>
                    <td className="hidden px-4 py-3 text-center sm:table-cell">
                      <span className="font-semibold text-foreground">{client.activeServices}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      <span className={cn('font-bold', client.pendingPayments > 0 ? 'text-amber-600' : 'text-green-600')}>
                        {client.pendingPayments}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {client.firms.map(f => <FirmPill key={f} firm={f} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentBadge(client.pendingPayments)}`}>
                        {client.pendingPayments >= 2 ? 'Urgente' : client.pendingPayments === 1 ? 'Pendiente' : 'Al corriente'}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', selected?.id === client.id && 'rotate-90')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Client detail panel */}
        {selected && (
          <div className="w-full lg:w-72 shrink-0">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-serif text-lg font-semibold text-foreground">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">{selected.company}</p>
              </div>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-secondary/50 p-3 text-center">
                    <p className="font-serif text-2xl font-bold text-foreground">{selected.activeServices}</p>
                    <p className="text-[10px] text-muted-foreground">Servicios activos</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/50 p-3 text-center">
                    <p className={cn('font-serif text-2xl font-bold', selected.pendingPayments > 0 ? 'text-amber-600' : 'text-green-600')}>
                      {selected.pendingPayments}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Pagos pendientes</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Firmas asignadas</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {selected.firms.map(f => <FirmPill key={f} firm={f} />)}
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contacto</p>
                  <div className="space-y-1.5">
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="h-3.5 w-3.5" />{selected.email}
                    </a>
                    <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Phone className="h-3.5 w-3.5" />{selected.phone}
                    </a>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Última actividad</p>
                  <p className="text-xs text-foreground">{new Date(selected.lastActivity).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>

                <Link href={`/admin/clientes/${selected.id}`} className="block w-full rounded-lg border border-[#1C2B4A] bg-[#1C2B4A] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 text-center">
                  Ver expediente completo
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
