"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { isTenantAdmin } from "@/app/actions/tenant-users"
import { getCurrentTenantName } from "@/app/actions/auth-helpers"
import { RailTip } from "@/components/client/rail-tip"
import { OteroAssistant } from "@/components/client/otero-assistant"
import { Skeleton } from "@/components/ui/skeleton"

const NAV = [
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
    label: "RegWatch",
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

const initialsOf = (name: string | null | undefined) =>
  (name ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]?.toUpperCase()).join("")

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isTA, setIsTA] = useState(false)
  const [company, setCompany] = useState<string | null>(null)
  const { data: session } = authClient.useSession()
  const personName = session?.user?.name ?? null
  useEffect(() => { isTenantAdmin().then(setIsTA).catch(() => {}) }, [])
  useEffect(() => { getCurrentTenantName().then(setCompany).catch(() => {}) }, [])
  const nav = isTA ? [...NAV, USUARIOS_NAV] : NAV

  // En RegWatch el menú principal se achica a íconos para dejar lugar a las vistas de la bandeja.
  const compact = pathname.startsWith("/cliente/obligaciones")

  function NavItem({ href, label, icon, badge, exact, compact: rail = false }: {
    href: string; label: string; icon: React.ReactNode; badge?: number; exact?: boolean; compact?: boolean
  }) {
    const isActive = exact ? pathname === href : pathname.startsWith(href)
    return (
      <RailTip label={label} show={rail}>
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        aria-label={rail ? label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all group",
          rail && "justify-center px-0",
          isActive
            ? "bg-surface-sunken text-ink font-semibold"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        )}
      >
        <span className={cn("shrink-0 transition-colors", isActive ? "text-ink" : "text-muted-foreground/60 group-hover:text-muted-foreground")}>
          {icon}
        </span>
        {!rail && <span className="flex-1 font-medium leading-none">{label}</span>}
        {!rail && badge && !isActive && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-risk text-surface text-[10px] font-bold px-1">
            {badge}
          </span>
        )}
        {!rail && isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
        )}
      </Link>
      </RailTip>
    )
  }

  const SidebarContent = ({ rail = false }: { rail?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className={cn("border-b border-border py-5", rail ? "px-3" : "px-5")}>
        <div className={cn("flex items-center mb-4", rail ? "justify-center" : "justify-between")}>
          <RailTip label={company} show={rail}>
          <Link href="/cliente" aria-label={rail ? company ?? "Inicio" : undefined} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ink flex items-center justify-center ">
              <span className="text-xs font-bold text-surface">{initialsOf(company) || "O"}</span>
            </div>
            {!rail && (
              <div>
                {company === null ? <Skeleton className="h-4 w-28" /> : <p className="text-sm font-semibold text-foreground leading-none">{company}</p>}
              </div>
            )}
          </Link>
          </RailTip>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          <ul className="space-y-0.5">
            {nav.map(item => (
              <li key={item.href}>
                <NavItem {...item} compact={rail} />
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
                  <NavItem {...item} compact={rail} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 space-y-0.5">
        <RailTip label="Mi perfil" show={rail}>
        <Link
          href="/cliente/perfil"
          aria-label={rail ? "Mi perfil" : undefined}
          className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all", rail && "justify-center px-0")}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          {!rail && <span className="font-medium">Mi perfil</span>}
        </Link>
        </RailTip>
        <RailTip label="Cerrar sesión" show={rail}>
        <button
          onClick={async () => { await authClient.signOut(); router.push("/sign-in"); router.refresh() }}
          aria-label={rail ? "Cerrar sesión" : undefined}
          className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all", rail && "justify-center px-0")}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          {!rail && <span className="font-medium">Cerrar sesión</span>}
        </button>
        </RailTip>
      </div>
    </div>
  )

  return (
    <div className="portal-shell portal-shell-client flex min-h-screen bg-background">

      {/* Desktop sidebar */}
      <aside className={cn("hidden md:flex shrink-0 flex-col border-r border-border bg-card transition-[width]", compact ? "w-[72px]" : "w-[220px] xl:w-[240px]")}>
        <div className="sticky top-0 h-screen overflow-hidden">
          <SidebarContent rail={compact} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-card border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
            <span className="text-[11px] font-bold text-surface">{initialsOf(company) || "O"}</span>
          </div>
          {company === null ? <Skeleton className="h-4 w-28" /> : <span className="text-sm font-semibold text-foreground">{company}</span>}
        </div>
        <div className="flex items-center gap-2">
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
        <div className="fixed inset-x-0 bottom-0 top-[var(--banner-h,0px)] z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card  border-r border-border">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop */}
      <div className="hidden md:flex flex-col flex-1 min-w-0 relative">
        {/* Top bar for desktop */}
        <header className="sticky top-0 z-30 flex items-center justify-end gap-3 bg-background border-b border-border px-8 py-3">
          <div className="flex-1" />
          <RailTip label={personName ?? "Mi perfil"} show side="bottom">
          <Link href="/cliente/perfil" aria-label={personName ?? "Mi perfil"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-xl bg-ink flex items-center justify-center">
              <span className="text-[11px] font-bold text-surface">{initialsOf(personName) || "U"}</span>
            </div>
            {personName === null ? <Skeleton className="hidden h-4 w-24 xl:block" /> : <span className="text-sm font-medium text-foreground hidden xl:block">{personName}</span>}
          </Link>
          </RailTip>
        </header>

        {/* Page content */}
        <main className="portal-main flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <OteroAssistant />

      {/* Mobile page content */}
      <main className="portal-main flex-1 min-w-0 overflow-y-auto pt-16 md:hidden">
        {children}
      </main>
    </div>
  )
}
