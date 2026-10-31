'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'

function SignOutButton() {
  const router = useRouter()
  return (
    <button
      onClick={async () => { await authClient.signOut(); router.push('/sign-in'); router.refresh() }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-surface/25 hover:bg-surface/[0.06] hover:text-surface/60 transition-all"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
      </svg>
      <span className="font-medium">Cerrar sesión</span>
    </button>
  )
}

const primaryNav = [
  {
    href: '/admin', label: 'Dashboard', exact: true,
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  },
]

const operationsNav: { href: string; label: string; icon: React.ReactNode; badge?: number }[] = []

const adminNav = [
  {
    href: '/admin/obligaciones', label: 'Asuntos regulatorios',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
    badgeDynamic: true,
  },
  {
    href: '/admin/documentos', label: 'Documentos',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
  },
  {
    href: '/admin/ingesta', label: 'Ingesta',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
  },
  {
    href: '/admin/noticias', label: 'Noticias',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>,
  },
]

const superAdminNav = [
  {
    href: '/admin/tenants', label: 'Empresas',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>,
  },
  {
    href: '/admin/users', label: 'Usuarios',
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  },
]

// ── Sidebar content ───────────────────────────────────────────────
export function AdminSidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = authClient.useSession()
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  const adminName = hydrated ? session?.user?.name?.trim() || 'Otero' : 'Otero'

  function NavItem({ href, label, icon, badge, exact }: {
    href: string; label: string; icon: React.ReactNode; badge?: number; exact?: boolean
  }) {
    const isActive = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        aria-current={isActive ? 'page' : undefined}
        style={isActive ? { backgroundColor: 'var(--brand)', color: 'var(--on-brand)' } : { color: 'var(--ink-muted)' }}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all group',
          !isActive && 'hover:bg-brand/10'
        )}
      >
        <span
          style={{ color: isActive ? 'var(--on-brand)' : 'var(--ink-muted)' }}
          className={cn('shrink-0 transition-colors', !isActive && 'group-hover:!text-brand-text')}
        >
          {icon}
        </span>
        <span style={{ color: isActive ? 'var(--surface)' : undefined }} className="flex-1 font-medium leading-none tracking-[-0.01em]">{label}</span>
        {badge && (
          <span className={cn(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
            isActive ? "bg-surface/20 text-surface" : "bg-surface-raised/10 text-ink-muted"
          )}>
            {badge}
          </span>
        )}
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-warn shrink-0" />
        )}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────── */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        {/* Brand row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div>
              <div className="flex items-baseline gap-1.5"><p style={{ color: 'var(--ink)' }} className="font-serif text-2xl font-semibold leading-none tracking-[-0.04em]">Otero</p><span style={{ color: 'var(--brand-text)' }} className="text-xs font-semibold tracking-[0.08em]">AI</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Nav ────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Primary */}
        <div>
          <ul className="space-y-0.5">
            {primaryNav.map(item => (
              <li key={item.href}>
                <NavItem {...item} />
              </li>
            ))}
          </ul>
        </div>

        {/* Compliance tools — MVP milestone */}
        <div>
          <ul className="space-y-0.5">
            {adminNav.map(item => (
              <li key={item.href}>
                <NavItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Superadmin: tenant + user management */}
        <div>
          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-surface/20">Administración</p>
          <ul className="space-y-0.5">
            {superAdminNav.map(item => (
              <li key={item.href}>
                <NavItem href={item.href} label={item.label} icon={item.icon} />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ── Footer ────���────────────────���──���── */}
      <div className="border-t border-surface/[0.06] px-3 py-3 space-y-0.5">
        <Link
          href="/cliente"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-surface/25 hover:bg-surface/[0.06] hover:text-surface/60 transition-all group"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <span className="font-medium">Vista de cliente</span>
        </Link>
        <SignOutButton />
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar — wider for web-first */}
      <aside
        style={{ backgroundColor: 'var(--surface)', color: 'var(--ink)', borderRight: '1px solid var(--border)' }}
        className="portal-sidebar portal-sidebar-admin hidden w-[240px] xl:w-[260px] shrink-0 md:flex flex-col"
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="admin-mobile-bar sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3.5 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex items-baseline gap-1.5"><span className="font-serif text-xl font-semibold text-foreground tracking-[-0.04em]">Otero</span><span className="text-xs font-semibold tracking-[0.08em] text-primary">AI</span></div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex size-11 items-center justify-center rounded-xl text-ink-muted hover:bg-surface/10 transition-colors"
            aria-label="Menú"
          >
            {mobileOpen
              ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            }
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setMobileOpen(false)} />
          <div className="admin-mobile-drawer absolute left-0 top-0 bottom-0 w-[min(21rem,calc(100vw-2rem))] bg-surface text-ink ">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
