'use client'

import { usePathname } from 'next/navigation'
import { AdminHomeSkeleton, ListPageSkeleton } from '@/components/shared/skeletons'

// Respaldo de todas las pantallas del admin: el tablero tiene su estructura y el resto se resuelve como lista.
export default function AdminLoading() {
  const pathname = usePathname()
  return pathname === '/admin' ? <AdminHomeSkeleton /> : <ListPageSkeleton label="Cargando" />
}
