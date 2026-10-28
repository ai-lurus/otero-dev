'use client'

import { Suspense, useRef, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { useSearchParams } from 'next/navigation'
import { DefaultChatTransport } from 'ai'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  '¿Cómo me afecta la última NOM publicada?',
  '¿Qué obligaciones debo renovar este mes?',
  'Resume las noticias del Diario Oficial recientes',
  '¿Tengo riesgos ambientales pendientes?',
]

function CompiChatInner() {
  const searchParams = useSearchParams()
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/compi' }),
  })
  const [input, setInput] = useState('')
  const bottomRef   = useRef<HTMLDivElement>(null)
  const autoSentRef = useRef(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-send ?q= param when arriving from noticias
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && !autoSentRef.current) {
      autoSentRef.current = true
      sendMessage({ text: q })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function submit() {
    const text = input.trim()
    if (!text || status === 'streaming' || status === 'submitted') return
    sendMessage({ text })
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const isStreaming = status === 'streaming' || status === 'submitted'
  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-background">

      {/* Header */}
      <div className="shrink-0 bg-ink px-5 pt-8 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-ink flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl font-semibold text-surface leading-none">Otero</h1>
            <p className="text-surface/40 text-[11px] mt-0.5">Asistente de compliance · Otero IA</p>
          </div>
          {isStreaming && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
              <span className="text-ok text-[10px] font-semibold">Pensando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center pt-6 pb-8">
            <div className="w-16 h-16 rounded-3xl bg-surface-sunken border border-border flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-foreground mb-1 text-center text-balance">Pregúntale a Otero</p>
            <p className="text-xs text-muted-foreground text-center text-balance mb-6 max-w-xs">
              Analiza cómo las regulaciones y el DOF se relacionan con tu empresa.
            </p>
            <div className="w-full flex flex-col gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage({ text: s })}
                  className="w-full text-left px-4 py-3 rounded-xl border border-border bg-card hover:border-foreground/20 hover:bg-secondary/40 transition-colors text-sm text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map(msg => {
              const isUser = msg.role === 'user'
              const text = msg.parts
                .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map(p => p.text)
                .join('')
              if (!text) return null
              return (
                <div key={msg.id} className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
                  {!isUser && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="w-5 h-5 rounded-lg bg-ink flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">Otero</span>
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                    isUser
                      ? 'bg-ink text-surface rounded-br-sm'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                  )}>
                    {text}
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {status === 'submitted' && (
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-lg bg-ink flex items-center justify-center shrink-0 mt-1">
                  <svg className="w-2.5 h-2.5 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                  {[0, 150, 300].map(d => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-safe-or-4 pt-2 bg-background border-t border-border">
        <div className="flex items-end gap-2 bg-muted rounded-2xl px-4 py-2.5">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Pregunta sobre regulaciones, NOMs, DOF..."
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                submit()
              }
            }}
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 resize-none min-h-[20px] leading-5"
          />
          <button
            onClick={submit}
            disabled={!input.trim() || isStreaming}
            className="w-8 h-8 rounded-xl bg-ink text-surface flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
          Otero usa IA · Verifica información crítica con tu asesor
        </p>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <CompiChatInner />
    </Suspense>
  )
}
