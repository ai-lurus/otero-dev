import { cn } from '@/lib/utils'

// Bloque de carga: pozo (`surface-sunken`) que pulsa, salvo que la persona pida menos movimiento.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn('bg-surface-sunken motion-safe:animate-pulse rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
