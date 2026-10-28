'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
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

// ── Static notification data ──────────────────────────────────────
const NOTIFICATIONS = [
  {
    id: 'n1', unread: true, href: '/admin/obligaciones',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
    iconBg: 'var(--risk-tint)', iconColor: 'var(--risk)',
    title: 'Obligación vencida — acción requerida',
    body: 'Certificado PROFEPA de Planta Vallejo Norte venció hace 8 días. Riesgo de clausura.',
    time: 'Hace 8 días',
  },
  {
    id: 'n2', unread: true, href: '/admin/obligaciones',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
    iconBg: 'var(--warn-tint)', iconColor: 'var(--warn-text)',
    title: 'Alerta escalada sin atender',
    body: 'Contrato de Arrendamiento Torre Reforma vence en 28 días. Sin responsable activo.',
    time: 'Hace 2 días',
  },
  {
    id: 'n3', unread: true, href: '/admin/obligaciones',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    iconBg: 'var(--surface-sunken)', iconColor: 'var(--ink)',
    title: 'Licencia Ambiental vence en 17 días',
    body: 'Planta Vallejo Norte. SEMARNAT tarda ~30 días — margen mínimo para renovar.',
    time: 'Hace 6 horas',
  },
  {
    id: 'n4', unread: false, href: '/admin/documentos',
    icon: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    iconBg: 'var(--ok-tint)', iconColor: 'var(--ok)',
    title: 'Documento cargado',
    body: 'Acta Constitutiva de Monterrico Industrias procesada correctamente.',
    time: 'Hace 3 días',
  },
]

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

// ── Notification Bell ─────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(NOTIFICATIONS)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 })
  const unreadCount = notes.filter(n => n.unread).length

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function openDropdown() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropPos({ top: rect.bottom + 8, left: rect.left })
    }
    setOpen(v => !v)
  }

  function markAllRead() {
    setNotes(notes.map(n => ({ ...n, unread: false })))
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={openDropdown}
        style={{ backgroundColor: 'var(--surface-sunken)' }}
        className="relative w-8 h-8 rounded-xl hover:!bg-brand/10 flex items-center justify-center transition-colors"
        aria-label="Notificaciones"
      >
        <svg style={{ color: 'var(--ink)' }} className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-risk text-surface text-[9px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="admin-notification-menu fixed z-50 w-80 max-w-[calc(100vw-1rem)] rounded-2xl bg-surface border border-border   overflow-hidden"
          style={{ top: dropPos.top, left: dropPos.left }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-risk text-surface px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-ink-muted hover:text-surface transition-colors font-medium">
                Marcar todo leído
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-surface/[0.04]">
            {notes.map(n => (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => {
                  setNotes(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x))
                  setOpen(false)
                }}
                className={cn(
                  'flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-brand/6',
                  n.unread ? 'bg-brand/4' : ''
                )}
              >
                <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5" style={{ background: n.iconBg, color: n.iconColor }}>
                  {n.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-[12px] font-semibold leading-tight', n.unread ? 'text-ink' : 'text-ink/65')}>{n.title}</p>
                  <p className="text-[11px] text-ink/60 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-ink/45 mt-1">{n.time}</p>
                </div>
                {n.unread && <span className="w-2 h-2 rounded-full bg-warn shrink-0 mt-1.5" />}
              </Link>
            ))}
          </div>

          <div className="border-t border-surface/[0.07] px-4 py-2.5">
            <button
              onClick={() => setOpen(false)}
              className="text-[11px] text-ink-muted/60 hover:text-ink-muted transition-colors w-full text-center font-medium"
            >
              Ver historial completo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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
          <NotificationBell />
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
          <NotificationBell />
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
