'use client'

import type { AssignableMember, RegulatoryItem } from '@/app/actions/regulatory-items'
import { Inbox } from '@/components/regulatory/inbox/inbox'

export default function ObligationsClient({ items, members }: { items: RegulatoryItem[]; members: AssignableMember[] }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Inbox items={items} members={members} />
    </main>
  )
}
