"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { isTenantAdmin } from "@/app/actions/tenant-users"

const NAV = [
  {
    href: "/cliente/chat",
    label: "Otero IA",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    href: "/cliente",
    label: "Inicio",
    exact: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/cliente/obligaciones",
    label: "Asuntos regulatorios",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    href: "/cliente/certificaciones",
    label: "Certificaciones",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
  {
    href: "/cliente/documentos",
    label: "Documentos",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    href: "/cliente/noticias",
    label: "Noticias",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
  },
]

// Solo lo ve el administrador de la empresa cliente (tenant_admin).
const USUARIOS_NAV: (typeof NAV)[number] = {
  href: "/cliente/usuarios",
  label: "Usuarios",
  icon: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
}

const SECONDARY_NAV: typeof NAV = []

const NOTIFICATIONS: Array<{ id: string; title: string; body: string; time: string; unread: boolean; icon: string }> = []

const NOTIF_COLORS: Record<string, { bg: string; color: string }> = {
  doc:     { bg: "var(--surface-sunken)", color: "var(--ink)" },
  alert:   { bg: "var(--risk-tint)", color: "var(--risk)" },
  chat:    { bg: "var(--ok-tint)", color: "var(--ok)" },
  pay:     { bg: "var(--warn-tint)", color: "var(--warn-text)" },
  service: { bg: "var(--ok-tint)", color: "var(--ok)" },
}

function NotifIcon({ type }: { type: string }) {
  if (type === "doc") return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
  if (type === "alert") return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
  if (type === "chat") return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
  if (type === "pay") return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
  return <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
}

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isTA, setIsTA] = useState(false)
  useEffect(() => { isTenantAdmin().then(setIsTA).catch(() => {}) }, [])
  const nav = isTA ? [...NAV, USUARIOS_NAV] : NAV

  const unreadCount = NOTIFICATIONS.filter(n => n.unread && !readIds.has(n.id)).length

  function markAllRead() {
    setReadIds(new Set(NOTIFICATIONS.map(n => n.id)))
  }

  function NavItem({ href, label, icon, badge, exact }: {
    href: string; label: string; icon: React.ReactNode; badge?: number; exact?: boolean
  }) {
    const isActive = exact ? pathname === href : pathname.startsWith(href)
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all group",
          isActive
            ? "bg-surface-sunken text-ink font-semibold"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        )}
      >
        <span className={cn("shrink-0 transition-colors", isActive ? "text-ink" : "text-muted-foreground/60 group-hover:text-muted-foreground")}>
          {icon}
        </span>
        <span className="flex-1 font-medium leading-none">{label}</span>
        {badge && !isActive && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-risk text-surface text-[10px] font-bold px-1">
            {badge}
          </span>
        )}
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
        )}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <Link href="/cliente" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center ">
              <span className="text-xs font-bold text-surface">GI</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">Grupo Industrial</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Portal de Compliance</p>
            </div>
          </Link>
        </div>

        {/* Status label */}
        <div className="flex items-center gap-1.5 bg-surface-sunken rounded-lg px-2.5 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
          <span className="text-[10px] text-ink font-semibold">Portal activo</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          <ul className="space-y-0.5">
            {nav.map(item => (
              <li key={item.href}>
                <NavItem {...item} />
              </li>
            ))}
          </ul>
        </div>

        {SECONDARY_NAV.length > 0 && (
          <div>
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Herramientas</p>
            <ul className="space-y-0.5">
              {SECONDARY_NAV.map(item => (
                <li key={item.href}>
                  <NavItem {...item} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        <Link
          href="/cliente/perfil"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span className="font-medium">Mi perfil</span>
        </Link>
        <button
          onClick={async () => { await authClient.signOut(); router.push("/sign-in"); router.refresh() }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          <span className="font-medium">Cerrar sesión</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="portal-shell portal-shell-client flex min-h-screen bg-background">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] xl:w-[240px] shrink-0 flex-col border-r border-border bg-card">
        <div className="sticky top-0 h-screen overflow-hidden">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-card border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
            <span className="text-[11px] font-bold text-surface">GI</span>
          </div>
          <span className="text-sm font-semibold text-foreground">Portal Compliance</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center"
          >
            <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-risk text-surface text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center"
          >
            {mobileOpen
              ? <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            }
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card  border-r border-border">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop notification panel */}
      <div className="hidden md:flex flex-col flex-1 min-w-0 relative">
        {/* Top bar for desktop */}
        <header className="sticky top-0 z-30 flex items-center justify-end gap-3 bg-background border-b border-border px-8 py-3">
          <div className="flex-1" />
          {/* Notification bell desktop */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-secondary/60 transition-colors"
            >
              <svg className="w-4.5 h-4.5 w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-risk text-surface text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown notifications */}
            {notifOpen && (
              <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl bg-card border border-border  overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Notificaciones</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-risk text-surface px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-ink font-medium hover:text-ink-muted transition-colors">
                      Marcar todo leído
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-border">
                  {NOTIFICATIONS.map(n => {
                    const isUnread = n.unread && !readIds.has(n.id)
                    const cfg = NOTIF_COLORS[n.icon]
                    return (
                      <button
                        key={n.id}
                        onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
                        className={cn("w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40", isUnread ? "bg-surface-sunken" : "")}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg, color: cfg.color }}>
                          <NotifIcon type={n.icon} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("text-xs leading-snug", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground")}>{n.title}</p>
                            {isUnread && <span className="w-2 h-2 rounded-full bg-risk shrink-0" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-1">{n.time}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <Link href="/cliente/perfil" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-ink flex items-center justify-center">
              <span className="text-[11px] font-bold text-surface">GI</span>
            </div>
            <span className="text-sm font-medium text-foreground hidden xl:block">Grupo Industrial</span>
          </Link>
        </header>

        {/* Page content */}
        <main className="portal-main flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile page content */}
      <main className="portal-main flex-1 min-w-0 overflow-y-auto pt-16 md:hidden">
        {children}
      </main>

      {/* Mobile notification overlay */}
      {notifOpen && (
        <div className="fixed inset-0 z-50 flex flex-col md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setNotifOpen(false)} />
          <div className="relative mt-auto bg-background rounded-t-3xl  max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-foreground">Notificaciones</h2>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 bg-risk text-surface text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-ink font-medium">
                    Marcar todo leído
                  </button>
                )}
                <button onClick={() => setNotifOpen(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {NOTIFICATIONS.map(n => {
                const isUnread = n.unread && !readIds.has(n.id)
                const cfg = NOTIF_COLORS[n.icon]
                return (
                  <button
                    key={n.id}
                    onClick={() => setReadIds(prev => new Set([...prev, n.id]))}
                    className={cn("w-full text-left flex items-start gap-3 px-5 py-3.5 border-b border-border/50 last:border-0 transition-colors", isUnread ? "bg-surface-sunken" : "")}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg, color: cfg.color }}>
                      <NotifIcon type={n.icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm leading-snug", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground")}>{n.title}</p>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-risk shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{n.time}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
