import { CardGridSkeleton, HeaderSkeleton } from '@/components/shared/skeletons'

export default function DocumentosLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando documentos" className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-10 md:py-10">
      <HeaderSkeleton />
      <CardGridSkeleton count={6} />
    </div>
  )
}
