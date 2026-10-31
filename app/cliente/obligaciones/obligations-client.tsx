'use client'

import Link from 'next/link'
import type { AssignableMember, RegulatoryItem } from '@/app/actions/regulatory-items'
import { Inbox } from '@/components/regulatory/inbox/inbox'

export default function ObligationsClient({ items, members, canDecide, profileIncomplete = false }: { items: RegulatoryItem[]; members: AssignableMember[]; canDecide: boolean; profileIncomplete?: boolean }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {profileIncomplete && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warn-text/20 bg-warn-tint px-6 py-2.5 text-sm text-warn-text">
          <span>Completa el perfil de tu empresa para recibir lo de tu sector. Por ahora solo te llega lo general.</span>
          <Link href="/cliente/perfil#monitoreo" className="font-semibold underline underline-offset-2">Completar perfil</Link>
        </div>
      )}
      <Inbox items={items} members={members} canDecide={canDecide} />
    </main>
  )
}
