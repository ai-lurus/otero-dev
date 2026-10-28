'use client'

import type { RegulatoryItem } from '@/app/actions/regulatory-items'
import { Inbox } from '@/components/regulatory/inbox/inbox'

export default function ObligationsClient({ items }: { items: RegulatoryItem[] }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Inbox items={items} />
    </main>
  )
}
