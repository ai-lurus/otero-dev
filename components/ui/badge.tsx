import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-pill border px-2.5 py-1 text-label w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1 [&>svg]:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-invalid:border-risk transition-colors overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-ink text-surface',
        secondary: 'border-transparent bg-surface-sunken text-ink',
        outline: 'border-border text-ink [a&]:hover:bg-surface-sunken',
        // Estados: siempre con palabra e ícono (usa <StatusTag> para alertas).
        risk: 'border-transparent bg-risk-tint text-risk',
        destructive: 'border-transparent bg-risk-tint text-risk',
        warn: 'border-transparent bg-warn-tint text-warn-text',
        ok: 'border-transparent bg-ok-tint text-ok',
        info: 'border-transparent bg-brand-tint text-brand-text',
        // Chip de plazo: "Vence en 5 días".
        deadline: 'border-transparent bg-warn text-on-warn',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
