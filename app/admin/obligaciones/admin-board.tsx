'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { RegulatoryItem } from '@/app/actions/regulatory-items'
import { ItemsList } from '@/components/regulatory/items-list'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ItemFormDialog } from './item-form'

type Props = { tenants: { id: string; name: string }[]; tenantId: string | null; items: RegulatoryItem[] }

export function AdminBoard({ tenants, tenantId, items }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<RegulatoryItem | 'new' | null>(null)

  if (!tenantId) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 md:px-10 md:py-12">
        <Empty className="mx-auto max-w-xl rounded-xl border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Aún no hay clientes</EmptyTitle>
            <EmptyDescription>Crea un cliente para empezar a capturar su matriz regulatoria.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Matriz regulatoria</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Captura asuntos regulatorios y legislativos, y envíalos al cliente cuando estén listos.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={tenantId} onValueChange={(value) => router.push(`/admin/obligaciones?tenant=${value}`)}>
              <SelectTrigger aria-label="Cliente" className="min-h-11 sm:w-72"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button onClick={() => setEditing('new')} className="min-h-11">
              <Plus data-icon="inline-start" />
              Nuevo asunto
            </Button>
          </div>
        </header>

        <ItemsList
          items={items}
          showDraft
          getHref={(item) => `/admin/obligaciones/${item.id}?tenant=${tenantId}`}
          emptyTitle="Este cliente aún no tiene asuntos"
          emptyDescription="Captura el primero con el botón Nuevo asunto."
        />
      </div>

      {editing && (
        <ItemFormDialog
          key={editing === 'new' ? 'new' : editing.id}
          tenantId={tenantId}
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </main>
  )
}
