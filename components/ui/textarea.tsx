import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-border-strong bg-surface-raised text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink aria-invalid:border-risk flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-body transition-colors disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-sunken disabled:text-ink-muted',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
