'use client'

import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Boletín (automático) y notas del despacho (a mano) en una sola pantalla.
export default function NoticiasTabs({ bulletin, posts }: { bulletin: ReactNode; posts: ReactNode }) {
  const [tab, setTab] = useState<'boletin' | 'despacho'>('boletin')
  return (
    <div className="flex flex-col">
      <div className="flex gap-6 border-b border-border px-6 pt-6" role="tablist">
        {([['boletin', 'Boletín de noticias'], ['despacho', 'Del despacho']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn('-mb-px border-b-2 pb-3 text-body-sm font-medium', tab === id ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink')}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'boletin' ? bulletin : posts}
    </div>
  )
}
