import { ClientSidebar } from '@/components/client/sidebar'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <ClientSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
