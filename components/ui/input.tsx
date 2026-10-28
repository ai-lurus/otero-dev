import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-ink placeholder:text-ink-muted selection:bg-brand-tint selection:text-ink border-border-strong bg-surface-raised text-ink h-10 w-full min-w-0 rounded-md border px-3 py-2 text-body transition-colors file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-body-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-sunken disabled:text-ink-muted',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
        'aria-invalid:border-risk',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
