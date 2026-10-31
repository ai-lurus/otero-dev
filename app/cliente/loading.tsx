import { ListPageSkeleton } from '@/components/shared/skeletons'

// Respaldo de las pantallas del portal sin su propia carga: se resuelve como
// lista. El inicio tiene su espera dentro de su página. Es un componente de
// servidor a propósito: sin hooks del navegador no se desajusta al hidratar.
export default function ClienteLoading() {
  return <ListPageSkeleton label="Cargando el portal" />
}
