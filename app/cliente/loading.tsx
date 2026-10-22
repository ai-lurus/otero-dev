import { Skeleton } from '@/components/ui/skeleton'

export default function ClienteLoading() {
  return (
    <main className="min-h-[60vh] px-4 py-6 md:px-10 md:py-10" aria-busy="true" aria-label="Cargando portal cliente">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </main>
  )
}
