'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { adminClients, allMessages, services } from '@/lib/data'
import { cn } from '@/lib/utils'
import type { Message, Firm } from '@/lib/types'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────
type ReplyAs = 'mia' | 'paulsen'

interface ServiceThread {
  serviceId: string
  messages: Message[]
}

// ── Helpers ───────────────────────────────────────────────────────
function formatTime(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000)
  if (diffH < 24) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  if (diffH < 48) return 'Ayer'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function clientForService(serviceId: string) {
  // In demo: all seeded services belong to cl1; map by firm for others
  return adminClients[0]
}

// ── Initial thread state — one thread per service ─────────────────
const EXTRA_SEEDS: Record<string, Message[]> = {
  // cl2 — Desarrollos Industriales del Norte (Paulsen)
  'demo-cl2-s1': [
    { id: 'cl2-1', serviceId: 'demo-cl2-s1', from: 'client', firm: 'paulsen', senderName: 'DIN', content: 'Buenas tardes. ¿Han recibido la respuesta de SEMARNAT respecto al plan de gestión ambiental?', timestamp: '2025-04-26T14:00:00', read: true },
    { id: 'cl2-2', serviceId: 'demo-cl2-s1', from: 'firm',   firm: 'paulsen', senderName: 'Ing. Carlos Mendoza', content: 'Sí, recibimos acuse de ingreso. Estamos en espera del dictamen técnico, plazo de 20 días hábiles.', timestamp: '2025-04-26T15:30:00', read: true },
  ],
  'demo-cl2-s2': [
    { id: 'cl2-3', serviceId: 'demo-cl2-s2', from: 'client', firm: 'paulsen', senderName: 'DIN', content: 'Necesito actualizar el expediente de la licencia ambiental de operación. ¿Qué documentos adicionales requieren?', timestamp: '2025-04-25T10:00:00', read: false },
  ],
  // cl3 — Constructora Metropolitana GDL (MIA)
  'demo-cl3-s1': [
    { id: 'cl3-1', serviceId: 'demo-cl3-s1', from: 'client', firm: 'mia', senderName: 'CMG', content: 'Quisiera revisar el avance de nuestros trámites esta semana. ¿Tienen disponibilidad para una llamada?', timestamp: '2025-04-25T09:00:00', read: true },
    { id: 'cl3-2', serviceId: 'demo-cl3-s1', from: 'firm',   firm: 'mia', senderName: 'Dra. Ana García', content: 'Claro, podemos el jueves a las 11am o viernes 9am. ¿Cuál les queda mejor?', timestamp: '2025-04-25T09:45:00', read: true },
    { id: 'cl3-3', serviceId: 'demo-cl3-s1', from: 'client', firm: 'mia', senderName: 'CMG', content: 'Jueves 11am perfecto.', timestamp: '2025-04-25T10:00:00', read: false },
  ],
  'demo-cl3-s2': [
    { id: 'cl3-4', serviceId: 'demo-cl3-s2', from: 'firm', firm: 'mia', senderName: 'Lic. Roberto Vega', content: 'El análisis de la escritura pública de la nave industrial está listo. Pueden pasar a firmar cuando gusten.', timestamp: '2025-04-24T16:00:00', read: true },
  ],
  'demo-cl3-s3': [
    { id: 'cl3-5', serviceId: 'demo-cl3-s3', from: 'client', firm: 'mia', senderName: 'CMG', content: '¿Ya tienen el certificado de no adeudo predial de la nave actualizado?', timestamp: '2025-04-23T11:00:00', read: true },
  ],
  // cl4 — Logística Bajío (Paulsen + MIA)
  'demo-cl4-s1': [
    { id: 'cl4-1', serviceId: 'demo-cl4-s1', from: 'firm', firm: 'paulsen', senderName: 'Ing. Carlos Mendoza', content: 'Les recordamos que la Licencia Ambiental del Parque Logístico vence el 10 de mayo. Iniciar renovación esta semana.', timestamp: '2025-04-24T08:30:00', read: false },
  ],
}

const DEMO_SERVICE_THREADS: Record<string, { label: string; firm: Firm; clientId: string }[]> = {
  cl2: [
    { label: 'Licencia Ambiental — Planta Monterrey',  firm: 'paulsen', clientId: 'cl2' },
    { label: 'Autorización Impacto Ambiental Fase II', firm: 'paulsen', clientId: 'cl2' },
  ],
  cl3: [
    { label: 'Contratos Laborales 2025',          firm: 'mia', clientId: 'cl3' },
    { label: 'Due Diligence Nave Industrial GDL', firm: 'mia', clientId: 'cl3' },
    { label: 'Constitución Filial Bajío',         firm: 'mia', clientId: 'cl3' },
  ],
  cl4: [
    { label: 'Licencia Ambiental — Parque Logístico', firm: 'paulsen', clientId: 'cl4' },
  ],
}

function buildInitialThreads(): ServiceThread[] {
  const threads: ServiceThread[] = []

  // Real seeded services for cl1
  for (const svc of services) {
    const msgs = allMessages.filter(m => m.serviceId === svc.id)
    threads.push({ serviceId: svc.id, messages: msgs })
  }

  // Demo threads for other clients
  for (const [clientId, svcs] of Object.entries(DEMO_SERVICE_THREADS)) {
    svcs.forEach((s, i) => {
      const demoId = `demo-${clientId}-s${i + 1}`
      const seed = EXTRA_SEEDS[demoId] ?? [{
        id: `seed-${demoId}`,
        serviceId: demoId,
        from: 'client' as const,
        firm: s.firm,
        senderName: adminClients.find(c => c.id === clientId)?.name.split(' ').map(w => w[0]).join('').slice(0, 3) ?? 'CLI',
        content: 'Hola, ¿hay novedades en este expediente?',
        timestamp: new Date(Date.now() - 86400000 * (i + 1)).toISOString(),
        read: i > 0,
      }]
      threads.push({ serviceId: demoId, messages: seed })
    })
  }

  return threads
}

// ── Sender avatar ─────────────────────────────────────────────────
function SenderAvatar({ msg }: { msg: Message }) {
  if (msg.from === 'firm' && msg.firm === 'paulsen') {
    return <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ok text-[9px] font-bold text-ok">PC</div>
  }
  if (msg.from === 'firm') {
    return <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-surface/70">MIA</div>
  }
  return <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary border border-border text-[9px] font-bold text-foreground">{msg.senderName.substring(0, 3)}</div>
}

// ── Sidebar thread item ───────────────────────────────────────────
function ThreadItem({ thread, label, firm, isActive, unread, onSelect }: {
  thread: ServiceThread; label: string; firm: Firm
  isActive: boolean; unread: boolean; onSelect: () => void
}) {
  const last = thread.messages[thread.messages.length - 1]
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col gap-0.5 border-b border-border/50 px-3 py-2.5 text-left transition-colors',
        isActive ? 'bg-secondary' : 'hover:bg-secondary/50'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Firm color dot */}
        <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', firm === 'paulsen' ? 'bg-paulsen' : 'bg-mia')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className={cn('truncate text-[11px]', unread ? 'font-bold text-foreground' : 'font-semibold text-foreground/80')}>{label}</p>
            {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-risk" />}
          </div>
          {last && (
            <p className="truncate text-[10px] text-muted-foreground leading-snug mt-0.5">{last.content}</p>
          )}
          {last && (
            <p className="text-[9px] text-muted-foreground/60 mt-0.5">{formatTime(last.timestamp)}</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Build lookup maps ─────────────────��────────────────────────────
function buildServiceLabel(serviceId: string): { label: string; firm: Firm; clientId: string } {
  // Real service
  const svc = services.find(s => s.id === serviceId)
  if (svc) {
    return { label: svc.title, firm: svc.firm as Firm, clientId: 'cl1' }
  }
  // Demo service
  for (const [clientId, svcs] of Object.entries(DEMO_SERVICE_THREADS)) {
    svcs.forEach((s, i) => {
      if (`demo-${clientId}-s${i + 1}` === serviceId) {
        // will be handled below
      }
    })
  }
  for (const [clientId, svcs] of Object.entries(DEMO_SERVICE_THREADS)) {
    for (let i = 0; i < svcs.length; i++) {
      if (`demo-${clientId}-s${i + 1}` === serviceId) {
        return { label: svcs[i].label, firm: svcs[i].firm, clientId }
      }
    }
  }
  return { label: serviceId, firm: 'mia', clientId: 'cl1' }
}

// ── Main component ────────────────────────────────────────────────
function AdminChatInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const serviceParam = searchParams.get('service')

  const [threads, setThreads] = useState<ServiceThread[]>(buildInitialThreads)
  const [activeServiceId, setActiveServiceId] = useState<string>(() =>
    serviceParam && services.find(s => s.id === serviceParam) ? serviceParam : services[0].id
  )
  const [replyAs, setReplyAs] = useState<ReplyAs>('mia')
  const [input, setInput] = useState('')
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set(['cl1']))
  const bottomRef = useRef<HTMLDivElement>(null)

  // On service param change
  useEffect(() => {
    if (!serviceParam) return
    const svc = services.find(s => s.id === serviceParam)
    if (!svc) return
    setActiveServiceId(serviceParam)
    setReplyAs(svc.firm === 'paulsen' ? 'paulsen' : 'mia')
    setExpandedClients(prev => new Set([...prev, 'cl1']))
  }, [serviceParam])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeServiceId, threads])

  const activeThread = threads.find(t => t.serviceId === activeServiceId)
  const activeMeta = buildServiceLabel(activeServiceId)
  const activeClient = adminClients.find(c => c.id === activeMeta.clientId)
  const linkedService = services.find(s => s.id === activeServiceId)

  function handleSend() {
    const trimmed = input.trim()
    if (!trimmed) return
    const newMsg: Message = {
      id: String(Date.now()),
      from: 'firm',
      senderName: replyAs === 'mia' ? 'Dra. Ana García' : 'Ing. Carlos Mendoza',
      content: trimmed,
      timestamp: new Date().toISOString(),
      read: true,
      firm: replyAs,
      serviceId: activeServiceId,
    }
    setThreads(prev => prev.map(t =>
      t.serviceId === activeServiceId ? { ...t, messages: [...t.messages, newMsg] } : t
    ))
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function toggleClient(clientId: string) {
    setExpandedClients(prev => {
      const next = new Set(prev)
      next.has(clientId) ? next.delete(clientId) : next.add(clientId)
      return next
    })
  }

  // Group threads by client
  const clientGroups = adminClients.map(client => {
    const clientThreads = threads
      .map(t => ({ thread: t, meta: buildServiceLabel(t.serviceId) }))
      .filter(({ meta }) => meta.clientId === client.id)
    return { client, threads: clientThreads }
  }).filter(g => g.threads.length > 0)

  const totalUnread = threads.reduce((sum, t) =>
    sum + t.messages.filter(m => !m.read && m.from === 'client').length, 0
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card sm:flex overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-4 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base font-semibold text-foreground">Conversaciones</h2>
              <p className="text-[11px] text-muted-foreground">{threads.length} threads · {totalUnread} sin leer</p>
            </div>
            {totalUnread > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-risk text-[10px] font-bold text-surface px-1.5">
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* Grouped by client */}
        <div className="flex-1 overflow-y-auto">
          {clientGroups.map(({ client, threads: clientThreads }) => {
            const isOpen = expandedClients.has(client.id)
            const clientUnread = clientThreads.reduce((s, { thread }) =>
              s + thread.messages.filter(m => !m.read && m.from === 'client').length, 0
            )
            return (
              <div key={client.id} className="border-b border-border/40">
                {/* Client header */}
                <button
                  onClick={() => toggleClient(client.id)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 hover:bg-secondary/40 transition-colors"
                >
                  {/* Avatar */}
                  <div className="h-7 w-7 shrink-0 rounded-full bg-ink flex items-center justify-center text-[9px] font-bold text-surface/70">
                    {client.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate text-[11px] font-semibold text-foreground">{client.name}</p>
                    <p className="truncate text-[9px] text-muted-foreground">{clientThreads.length} servicio{clientThreads.length !== 1 ? 's' : ''}</p>
                  </div>
                  {clientUnread > 0 && (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-risk text-[9px] font-bold text-surface px-1 shrink-0">
                      {clientUnread}
                    </span>
                  )}
                  <svg className={cn('w-3 h-3 text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Service threads */}
                {isOpen && clientThreads.map(({ thread, meta }) => {
                  const unread = thread.messages.some(m => !m.read && m.from === 'client')
                  return (
                    <ThreadItem
                      key={thread.serviceId}
                      thread={thread}
                      label={meta.label}
                      firm={meta.firm}
                      isActive={thread.serviceId === activeServiceId}
                      unread={unread}
                      onSelect={() => {
                        setActiveServiceId(thread.serviceId)
                        const svc = services.find(s => s.id === thread.serviceId)
                        setReplyAs(svc?.firm === 'paulsen' ? 'paulsen' : 'mia')
                        if (thread.serviceId !== serviceParam) router.replace('/admin/chat')
                      }}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────��───────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 border-b border-border bg-card px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {/* Service name as primary title */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'h-2 w-2 rounded-full shrink-0',
                  activeMeta.firm === 'paulsen' ? 'bg-paulsen' : 'bg-mia'
                )} />
                <h3 className="font-serif text-base font-semibold text-foreground leading-tight truncate">
                  {activeMeta.label}
                </h3>
              </div>
              {/* Client sub-label */}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{activeClient?.name}</span>
                {activeClient?.company && (
                  <>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-xs text-muted-foreground">{activeClient.company}</span>
                  </>
                )}
                {linkedService && (
                  <Link
                    href={`/admin/servicios/${linkedService.id}`}
                    className="ml-1 text-[10px] font-semibold text-ink hover:underline"
                  >
                    Ver expediente →
                  </Link>
                )}
              </div>
            </div>

            {/* Reply-as toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-lg border border-border bg-secondary p-0.5">
                <button onClick={() => setReplyAs('mia')} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-all', replyAs === 'mia' ? 'bg-ink text-surface ' : 'text-muted-foreground hover:text-foreground')}>
                  Corp.
                </button>
                <button onClick={() => setReplyAs('paulsen')} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-all', replyAs === 'paulsen' ? 'bg-ok text-surface ' : 'text-muted-foreground hover:text-foreground')}>
                  Amb.
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mx-auto max-w-2xl">
            {activeThread?.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">Sin mensajes aún</p>
                <p className="text-xs text-muted-foreground">Inicia la conversación con el cliente sobre este servicio.</p>
              </div>
            )}

            <div className="space-y-3">
              {activeThread?.messages.map((msg, idx) => {
                const prevMsg = activeThread.messages[idx - 1]
                const showDate = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString()
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-2 my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] font-semibold text-muted-foreground px-2">
                          {new Date(msg.timestamp).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className={cn('flex gap-2.5', msg.from === 'client' ? 'flex-row-reverse' : 'flex-row')}>
                      <SenderAvatar msg={msg} />
                      <div className={cn('flex max-w-[75%] flex-col', msg.from === 'client' ? 'items-end' : 'items-start')}>
                        <div className="mb-1 flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground">
                            {msg.from === 'client' ? activeClient?.name : msg.senderName}
                          </span>
                          {msg.from === 'firm' && (
                            <span className="text-[10px] text-muted-foreground">· {msg.firm === 'mia' ? 'Corporativo' : 'Ambiental'}</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={cn(
                          'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ',
                          msg.from === 'client'
                            ? 'rounded-tr-sm bg-secondary text-foreground border border-border'
                            : msg.firm === 'paulsen'
                            ? 'rounded-tl-sm bg-ok text-surface'
                            : 'rounded-tl-sm bg-ink text-surface'
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>

        {/* Encryption notice */}
        <div className="flex items-center justify-center gap-1.5 py-1.5 border-t border-border/50 bg-background shrink-0">
          <svg className="w-3 h-3 text-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <p className="text-[9px] font-semibold text-ok/80 tracking-wide">Mensajes cifrados · AWS KMS</p>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-card px-5 py-3">
          <div className="mx-auto max-w-2xl">
            <div className={cn(
              'flex items-end gap-2 rounded-xl border p-3 transition-colors',
              replyAs === 'mia' ? 'border-surface/28 bg-surface-sunken' : 'border-ok/40 bg-ok/5'
            )}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Responder como ${replyAs === 'mia' ? 'Área Corporativa' : 'Área Ambiental'}…`}
                rows={1}
                className="min-h-[36px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-surface transition-opacity hover:opacity-90 disabled:opacity-30',
                  replyAs === 'mia' ? 'bg-ink' : 'bg-ok'
                )}
                aria-label="Enviar"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground text-sm">Cargando chat…</div>}>
      <AdminChatInner />
    </Suspense>
  )
}
