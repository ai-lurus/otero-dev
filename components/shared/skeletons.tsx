import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Pantallas de carga con la misma estructura que las reales: mismo ancho,
// mismos espacios y la misma jerarquía, para que no salte nada al cargar.

const PANEL = 'rounded-lg border border-border bg-surface-raised shadow-sm'

function Busy({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  )
}

/** Título de página (display-md) con una línea de apoyo opcional. */
export function HeaderSkeleton({ withSubtitle = true }: { withSubtitle?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-64 max-w-full" />
      {withSubtitle && <Skeleton className="h-4 w-80 max-w-full" />}
    </div>
  )
}

/** Tabla: encabezado en pozo y filas. `widths` son clases de ancho de cada columna; `flex-1` ocupa el resto. */
export function TableSkeleton({ widths, rows = 6, className }: { widths: string[]; rows?: number; className?: string }) {
  return (
    <div className={cn('overflow-hidden', PANEL, className)}>
      <div className="flex items-center gap-6 bg-surface-sunken px-3 py-3">
        {widths.map((width, index) => (
          <div key={index} className={cn('shrink-0', width, width === 'flex-1' && 'min-w-0 shrink')}><Skeleton className="h-3 w-3/4 bg-border" /></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-6 border-t border-border px-3 py-4">
          {widths.map((width, index) => (
            <div key={index} className={cn('shrink-0', width, width === 'flex-1' && 'min-w-0 shrink')}><Skeleton className="h-4 w-full" /></div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Cuadrícula de tarjetas. */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn('flex flex-col gap-3 p-6', PANEL)}>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ))}
    </div>
  )
}

/** Pantalla estándar: encabezado, barra de búsqueda y tabla. Sirve para casi cualquier lista. */
export function ListPageSkeleton({ label = 'Cargando' }: { label?: string }) {
  return (
    <Busy label={label} className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-10 md:py-10">
      <HeaderSkeleton />
      <Skeleton className="h-11 w-full max-w-md rounded-md" />
      <TableSkeleton widths={['w-6', 'flex-1', 'w-36', 'w-28']} />
    </Busy>
  )
}

/** RegWatch: columna de vistas, título, buscador y tabla de asuntos. */
export function InboxSkeleton() {
  return (
    <Busy label="Cargando RegWatch" className="grid min-h-[calc(100vh-4rem)] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
      <div className="hidden flex-col gap-2 border-r border-border p-6 md:flex">
        <Skeleton className="mb-1 h-3 w-16" />
        {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-9 w-full" />)}
        <Skeleton className="mt-3 mb-1 h-3 w-16" />
        {[0, 1, 2].map((index) => <Skeleton key={index} className="h-9 w-full" />)}
      </div>
      <div className="flex min-w-0 flex-col gap-6 p-4 md:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-28 rounded-md" />
        </div>
        <TableSkeleton widths={['w-6', 'w-24', 'flex-1', 'w-36', 'w-28']} rows={7} />
      </div>
    </Busy>
  )
}

/** Detalle de un asunto: volver, título, etiquetas, pestañas y datos en dos columnas. */
export function DetailSkeleton() {
  return (
    <Busy label="Cargando el asunto" className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-5 md:px-10 md:py-10">
      <Skeleton className="h-5 w-40" />
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-pill" />
          <Skeleton className="h-6 w-20 rounded-pill" />
        </div>
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex gap-2 border-b border-border pb-3">
        {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-8 w-24" />)}
      </div>
      <div className={cn('grid gap-6 p-6 sm:grid-cols-2', PANEL)}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>
    </Busy>
  )
}

/** Inicio del portal del cliente: saludo, indicadores y lista de lo urgente. */
export function HomeSkeleton() {
  return (
    <Busy label="Cargando inicio" className="flex flex-col gap-6">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:px-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className={cn('flex flex-col gap-3 p-6', PANEL)}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-16" />
            </div>
          ))}
        </div>
        <div className={cn('flex flex-col gap-4 p-6', PANEL)}>
          <Skeleton className="h-5 w-48" />
          {[0, 1, 2].map((index) => <Skeleton key={index} className="h-12 w-full" />)}
        </div>
      </div>
    </Busy>
  )
}

/** Formulario o perfil: secciones con campos. */
export function FormSkeleton() {
  return (
    <Busy label="Cargando" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-10 md:py-10">
      <HeaderSkeleton />
      {[0, 1].map((section) => (
        <div key={section} className={cn('flex flex-col gap-5 p-6', PANEL)}>
          <Skeleton className="h-5 w-40" />
          {[0, 1, 2].map((field) => (
            <div key={field} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      ))}
    </Busy>
  )
}

/** Tablero del admin: indicadores y dos columnas. */
export function AdminHomeSkeleton() {
  return (
    <Busy label="Cargando el panel" className="flex flex-col gap-6">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="flex flex-col gap-8 px-4 sm:px-6 xl:flex-row xl:px-10">
        <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={cn('flex flex-col gap-3 p-4', PANEL)}>
              <Skeleton className="size-10 rounded-md" />
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className={cn('flex flex-col gap-3 p-5 xl:w-80', PANEL)}>
          <Skeleton className="h-5 w-48" />
          {[0, 1, 2].map((index) => <Skeleton key={index} className="h-10 w-full" />)}
        </div>
      </div>
    </Busy>
  )
}
