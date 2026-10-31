import { ListPageSkeleton } from '@/components/shared/skeletons'

// Respaldo de las pantallas del admin: se resuelve como lista. El tablero tiene
// su propia espera dentro de su página. Es un componente de servidor a propósito:
// sin hooks del navegador, el HTML que se transmite no se desajusta al hidratar.
export default function AdminLoading() {
  return <ListPageSkeleton label="Cargando" />
}
