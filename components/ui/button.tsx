import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Design system: body-sm 500, radius-md, foco 2px ink con 2px de separación.
  // Deshabilitado: surface-sunken + ink-muted + borde, nunca opacidad.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent text-body-sm font-medium transition-colors [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:pointer-events-none disabled:border-border disabled:bg-surface-sunken disabled:text-ink-muted aria-invalid:border-risk",
  {
    variants: {
      variant: {
        // Una sola acción primaria (rosa) por vista.
        default: 'bg-brand text-on-brand hover:bg-ink hover:text-surface',
        // Las acciones destructivas no van en rosa: secundario con texto risk, y confirma con un diálogo.
        destructive:
          'border-risk bg-transparent text-risk hover:bg-risk-tint',
        outline:
          'border-ink bg-transparent text-ink hover:bg-surface-sunken',
        secondary:
          'border-ink bg-transparent text-ink hover:bg-surface-sunken',
        ghost:
          'text-ink hover:bg-surface-sunken',
        link: 'text-brand-text underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-10 px-5 py-2.5 has-[>svg]:px-4',
        sm: 'min-h-8 gap-1.5 px-3 py-1.5 has-[>svg]:px-2.5',
        lg: 'min-h-12 px-5 py-3 has-[>svg]:px-4',
        icon: 'size-10',
        'icon-sm': 'size-8',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
