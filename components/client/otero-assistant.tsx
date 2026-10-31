'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { ArrowUp, Maximize2, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const GENERIC = [
  '¿Qué debo atender primero?',
  '¿Qué vence este mes?',
  '¿Cómo me afecta lo último que publicó el DOF?',
]
const REGWATCH = [
  '¿Qué debo atender primero?',
  '¿Qué vence esta semana?',
  'Resúmeme lo de impacto alto',
]

/** Asistente de Otero: un chat flotante disponible en todas las pantallas del portal. */
export function OteroAssistant() {
  const pathname = usePathname()
  const pathRef = useRef(pathname)
  pathRef.current = pathname

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/compi',
      // La ruta actual le dice al asistente en qué pantalla está la persona.
      prepareSendMessagesRequest: ({ messages: history, id }) => ({ body: { id, messages: history, pathname: pathRef.current } }),
    }),
  })

  const busy = status === 'submitted' || status === 'streaming'
  const suggestions = pathname.startsWith('/cliente/obligaciones') ? REGWATCH : GENERIC

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // La página de chat completa ya es el asistente.
  if (pathname.startsWith('/cliente/chat')) return null

  function submit(text = input) {
    const value = text.trim()
    if (!value || busy) return
    sendMessage({ text: value })
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-pill bg-ink px-4 py-3 text-body-sm font-medium text-surface transition-colors hover:bg-ink/90 md:right-6 md:bottom-6"
        >
          <Sparkles aria-hidden className="size-4" />
          Pregunta a Otero
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Asistente de Otero"
          className="fixed inset-0 z-50 flex flex-col border-border-strong bg-surface-raised md:inset-auto md:right-6 md:bottom-6 md:h-[36rem] md:max-h-[calc(100vh-3rem)] md:w-[26rem] md:rounded-lg md:border"
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-ink text-surface">
              <Sparkles aria-hidden className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-heading leading-none text-ink">Otero</p>
              <p className="mt-1 text-caption text-ink-muted">{busy ? 'Pensando…' : 'Pregunta sobre tus asuntos'}</p>
            </div>
            <Link href="/cliente/chat" aria-label="Abrir en pantalla completa" title="Abrir en pantalla completa" className="rounded-md p-2 !text-ink-muted hover:bg-surface-sunken hover:!text-ink">
              <Maximize2 aria-hidden className="size-4" />
            </Link>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink">
              <X aria-hidden className="size-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-body-sm text-ink-muted">Te ayudo a entender qué te afecta y qué atender primero. Prueba con:</p>
                {suggestions.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => submit(text)}
                    className="rounded-md border border-border bg-surface px-4 py-3 text-left text-body-sm text-ink transition-colors hover:bg-surface-sunken"
                  >
                    {text}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((message) => {
                  const text = message.parts.filter((part): part is { type: 'text'; text: string } => part.type === 'text').map((part) => part.text).join('')
                  if (!text) return null
                  const mine = message.role === 'user'
                  return (
                    <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <p className={cn('max-w-[88%] rounded-lg px-4 py-3 text-body-sm whitespace-pre-wrap', mine ? 'bg-ink text-surface' : 'border border-border bg-surface text-ink')}>{text}</p>
                    </div>
                  )
                })}
                {status === 'submitted' && <p className="text-caption text-ink-muted">Pensando…</p>}
                {error && <p role="alert" className="text-body-sm text-risk">No pude responder. Intenta de nuevo.</p>}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2 rounded-md border border-border-strong bg-surface-raised px-3 py-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                placeholder="Escribe tu pregunta"
                aria-label="Pregunta para Otero"
                onChange={(event) => {
                  setInput(event.target.value)
                  event.target.style.height = 'auto'
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    submit()
                  }
                }}
                className="min-h-5 flex-1 resize-none bg-transparent text-body-sm leading-5 text-ink outline-none placeholder:text-ink-muted"
              />
              <button type="button" onClick={() => submit()} disabled={!input.trim() || busy} aria-label="Enviar" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-ink text-surface transition-opacity disabled:opacity-30">
                <ArrowUp aria-hidden className="size-4" />
              </button>
            </div>
            <p className="mt-2 text-center text-caption text-ink-muted">Otero usa IA. Revisa con tu abogado lo importante.</p>
          </div>
        </div>
      )}
    </>
  )
}
