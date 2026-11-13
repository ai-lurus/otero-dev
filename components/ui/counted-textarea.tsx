import * as React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type Props = Omit<React.ComponentProps<'textarea'>, 'maxLength' | 'value'> & {
  value: string
  maxLength: number
}

/** Texto largo con tope visible: crece con lo que escribes y avisa cuando te acercas al límite. */
export function CountedTextarea({ value, maxLength, className, rows = 4, id, ...props }: Props) {
  const counterId = id ? `${id}-count` : undefined
  const near = value.length >= maxLength * 0.9
  return (
    <div className="flex flex-col gap-1">
      <Textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-describedby={counterId}
        className={cn('resize-y leading-relaxed', className)}
        {...props}
      />
      <p id={counterId} className={cn('text-right text-caption tabular-nums', near ? 'text-warn-text' : 'text-ink-muted')}>
        {value.length.toLocaleString('es-MX')} / {maxLength.toLocaleString('es-MX')}
      </p>
    </div>
  )
}
