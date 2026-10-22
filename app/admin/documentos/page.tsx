'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { adminClients, clientDocuments, services } from '@/lib/data'
import { cn } from '@/lib/utils'
import { Upload } from 'lucide-react'
import { UploadDrawer } from '@/components/shared/upload-drawer'

type ViewMode = 'folders' | 'list'
type DocFilter = 'todos' | 'recibido' | 'enviado' | 'pendiente_firma'

export default function AdminDocumentosPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('folders')
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [filter, setFilter] = useState<DocFilter>('todos')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)

  // ── Counts per client ──────────────────────────────────────────
  const clientDocCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    adminClients.forEach(c => {
      // All docs belong to cl1 (Grupo Industrial Monterrico) in the dataset
      if (c.id === 'cl1') {
        counts[c.id] = clientDocuments.length
      } else {
        counts[c.id] = 0
      }
    })
    return counts
  }, [])

  // ── Client context ─────────────────────────────────────────────
  const client = adminClients.find(c => c.id === selectedClient)

  // ── Documents for selected client ──────────────────────────────
  const clientDocs = useMemo(() => {
    if (!selectedClient) return []
    // In real app, filter by clientId — here all docs belong to cl1
    return clientDocuments
  }, [selectedClient])

  // ── Group by service ───────────────────────────────────────────
  const docsByService = useMemo(() => {
    const groups: Record<string, typeof clientDocs> = { _general: [] }
    clientDocs.forEach(d => {
      if (!d.serviceId) {
        groups._general.push(d)
      } else {
        if (!groups[d.serviceId]) groups[d.serviceId] = []
        groups[d.serviceId].push(d)
      }
    })
    return groups
  }, [clientDocs])

  // ── Service detail docs (filtered) ─────────────────────────────
  const serviceDocs = useMemo(() => {
    if (!selectedService) return []
    const docs = docsByService[selectedService] || []
    return docs.filter(d => {
      if (filter !== 'todos' && d.direction !== filter) return false
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [selectedService, docsByService, filter, search])

  // ── Breadcrumb ──────────────────────────────────────────────────
  function Breadcrumb() {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <button
          onClick={() => { setSelectedClient(null); setSelectedService(null) }}
          className="hover:text-foreground transition-colors"
        >
          Documentos
        </button>
        {client && (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <button
              onClick={() => setSelectedService(null)}
              className={cn("hover:text-foreground transition-colors", !selectedService && "text-foreground font-semibold")}
            >
              {client.company}
            </button>
          </>
        )}
        {selectedService && (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-foreground font-semibold">
              {selectedService === '_general' ? 'Documentos Generales' : services.find(s => s.id === selectedService)?.title}
            </span>
          </>
        )}
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────
  // FOLDERS VIEW — Client folders
  // ────────────────────────────────────────────────────────────────
  if (!selectedClient) {
    return (
      <div className="min-h-full p-6 lg:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">Documentos</h1>
            <p className="mt-1 text-sm text-muted-foreground">Navega documentos por cliente y servicio</p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
          >
            <Upload className="h-4 w-4" />
            Subir documento
          </button>
        </div>
        <UploadDrawer open={uploadOpen} onClose={() => setUploadOpen(false)} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adminClients.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClient(c.id)}
              className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-[#8badd4]/50 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0a1628]/5 transition-colors group-hover:bg-[#0a1628]/10">
                  <svg className="h-5 w-5 text-[#8badd4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground leading-snug">{c.company}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.name}</p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8badd4] bg-[#8badd4]/10 px-2 py-0.5 rounded-md">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      {clientDocCounts[c.id] || 0} docs
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] text-muted-foreground/80">{c.activeServices} servicios activos</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────
  // SERVICE FOLDERS VIEW — Folders per service for selected client
  // ───────────────────��────────────────────────────────────────────
  if (selectedClient && !selectedService) {
    const serviceKeys = Object.keys(docsByService).filter(k => k !== '_general')
    return (
      <div className="min-h-full p-6 lg:p-8">
        <div className="mb-6">
          <Breadcrumb />
          <h1 className="font-serif text-3xl font-semibold text-foreground mt-2">
            {client?.company}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecciona un servicio para ver documentos asociados
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* General documents folder */}
          {docsByService._general && docsByService._general.length > 0 && (
            <button
              onClick={() => setSelectedService('_general')}
              className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-[#8badd4]/50 hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-muted/80">
                  <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground leading-snug">Documentos Generales</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Contratos, addendums, etc.</p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">{docsByService._general.length} documentos</span>
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Service folders */}
          {serviceKeys.map(sId => {
            const service = services.find(s => s.id === sId)
            if (!service) return null
            const count = docsByService[sId]?.length || 0
            return (
              <button
                key={sId}
                onClick={() => setSelectedService(sId)}
                className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-[#8badd4]/50 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                    service.firm === 'paulsen' ? "bg-[#2D5A3D]/10 group-hover:bg-[#2D5A3D]/20" : "bg-[#1C2B4A]/10 group-hover:bg-[#1C2B4A]/20"
                  )}>
                    <svg className={cn("h-5 w-5", service.firm === 'paulsen' ? "text-[#2D5A3D]" : "text-[#1C2B4A]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground leading-snug">{service.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{service.category}</p>
                    <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide",
                        service.firm === 'paulsen' ? "bg-[#EAF2EC] text-[#2D5A3D]" : "bg-[#EEF2F8] text-[#1C2B4A]"
                      )}>
                        {service.firm === 'paulsen' ? 'Ambiental' : 'Corporativo'}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">·</span>
                      <span className="text-xs font-bold text-foreground">{count} documentos</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────
  // DOCUMENT LIST VIEW — Documents for selected service
  // ────────────────────────────────────────────────────────────────
  const service = selectedService === '_general' ? null : services.find(s => s.id === selectedService)

  return (
    <div className="min-h-full p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Breadcrumb />
        <div className="flex items-start justify-between gap-4 mt-3">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              {selectedService === '_general' ? 'Documentos Generales' : service?.title}
            </h1>
            {service && (
              <div className="flex items-center gap-2 mt-2">
                <span className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide",
                  service.firm === 'paulsen' ? "bg-[#EAF2EC] text-[#2D5A3D]" : "bg-[#EEF2F8] text-[#1C2B4A]"
                )}>
                  {service.firm === 'paulsen' ? 'Ambiental' : 'Corporativo'}
                </span>
                <span className="text-xs text-muted-foreground">{service.category}</span>
              </div>
            )}
          </div>
          <Link
            href={`/admin/servicios/${selectedService}`}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[#1C2B4A] text-white px-3 py-2 rounded-xl hover:bg-[#1C2B4A]/90 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            Ver servicio
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar documento..."
          className="flex-1 min-w-[200px] rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-1 rounded-xl border border-border bg-background p-1">
          {(['todos', 'recibido', 'enviado', 'pendiente_firma'] as DocFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                filter === f
                  ? "bg-[#1C2B4A] text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === 'todos' ? 'Todos' : f === 'recibido' ? 'Recibidos' : f === 'enviado' ? 'Enviados' : 'Pendiente Firma'}
            </button>
          ))}
        </div>
      </div>

      {/* Document list */}
      {serviceDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-16 text-center">
          <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm font-medium text-muted-foreground">No hay documentos que coincidan</p>
          <p className="mt-1 text-xs text-muted-foreground">Ajusta los filtros o busca otro servicio</p>
        </div>
      ) : (
        <div className="space-y-2">
          {serviceDocs.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-[#8badd4]/50 hover:shadow-sm"
            >
              {/* Icon */}
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                doc.direction === 'recibido' ? "bg-[#F0FDF4]" : doc.direction === 'enviado' ? "bg-[#EEF2F8]" : "bg-[#FFFBEB]"
              )}>
                <svg className={cn(
                  "h-4 w-4",
                  doc.direction === 'recibido' ? "text-[#16A34A]" : doc.direction === 'enviado' ? "text-[#1C2B4A]" : "text-[#D97706]"
                )} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground leading-snug">{doc.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md",
                    doc.direction === 'recibido' ? "bg-[#F0FDF4] text-[#16A34A]" :
                    doc.direction === 'enviado' ? "bg-[#EEF2F8] text-[#1C2B4A]" :
                    "bg-[#FFFBEB] text-[#D97706]"
                  )}>
                    {doc.direction === 'recibido' ? 'Recibido' : doc.direction === 'enviado' ? 'Enviado' : 'Pendiente Firma'}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">·</span>
                  <span className="text-[10px] text-muted-foreground">{doc.size}</span>
                  <span className="text-[10px] text-muted-foreground/50">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
