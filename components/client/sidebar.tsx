'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  BookOpen,
  Award,
  LogOut,
  Menu,
  X,
  Building2,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/cliente', label: 'Inicio', icon: Building2, badge: null, exact: true },
  { href: '/cliente/obligaciones', label: 'Asuntos regulatorios', icon: AlertTriangle, badge: null },
  { href: '/cliente/certificaciones', label: 'Certificaciones', icon: Award, badge: null },
  { href: '/cliente/documentos', label: 'Documentos', icon: BookOpen, badge: null },
]

export function ClientSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* App brand */}
      <div className="border-b border-[rgba(139,173,212,0.12)] px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.08]">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="font-serif text-base font-semibold text-white tracking-[-0.01em]">Otero</span>
        </div>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-[#8badd4]/30 via-[#4ade80]/30 to-transparent" />
      </div>

      {/* Client info */}
      <div className="border-b border-[rgba(139,173,212,0.12)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(139,173,212,0.15)]">
            <Building2 className="h-4 w-4 text-[#8badd4]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Empresa cliente</p>
            <p className="truncate text-xs text-[rgba(139,173,212,0.7)]">Portal del Cliente</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-[rgba(139,173,212,0.5)]">
          Portal del Cliente
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                    isActive
                      ? 'bg-[rgba(139,173,212,0.15)] text-white'
                      : 'text-[rgba(139,173,212,0.75)] hover:bg-[rgba(139,173,212,0.08)] hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-[#8badd4]' : 'text-[rgba(139,173,212,0.6)]'
                    )}
                  />
                  <span className="flex-1 font-medium">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <span
                      className={cn(
                        'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                        item.href === '/client/permisos'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-[rgba(139,173,212,0.2)] text-[#8badd4]'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-[rgba(139,173,212,0.12)] px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[rgba(139,173,212,0.6)] transition-all hover:bg-[rgba(139,173,212,0.08)] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          <span>Cambiar vista</span>
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="portal-sidebar portal-sidebar-client hidden w-64 shrink-0 md:block">
        <div className="sticky top-0 h-screen overflow-hidden">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border bg-[#0d1e35] px-4 py-3 md:hidden">
        <span className="font-serif text-base font-semibold text-white">Otero</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-1.5 text-[#8badd4] hover:bg-[rgba(139,173,212,0.1)]"
          aria-label="Menú"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[#0d1e35]">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
