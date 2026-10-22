'use client'

import type { RegulatoryItem } from '@/app/actions/regulatory-items'
import { ItemsList } from '@/components/regulatory/items-list'

export default function ObligationsClient({ items }: { items: RegulatoryItem[] }) {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 border-b border-border pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Matriz regulatoria</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Asuntos regulatorios y legislativos que tu equipo legal identificó para tu empresa. Acepta, da seguimiento y registra evidencias.
          </p>
        </header>
        <ItemsList
          items={items}
          getHref={(item) => `/cliente/obligaciones/${item.id}`}
          emptyTitle="Aún no hay asuntos asignados"
          emptyDescription="Cuando tu equipo legal identifique un asunto relevante para tu empresa, aparecerá aquí."
        />
      </div>
    </main>
  )
}
