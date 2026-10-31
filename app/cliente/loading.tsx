'use client'

import { usePathname } from 'next/navigation'
import { HomeSkeleton, ListPageSkeleton } from '@/components/shared/skeletons'

// Respaldo de todas las pantallas del portal sin su propia carga: el inicio
// tiene su estructura y el resto se resuelve como lista.
export default function ClienteLoading() {
  const pathname = usePathname()
  return pathname === '/cliente' ? <HomeSkeleton /> : <ListPageSkeleton label="Cargando el portal" />
}
