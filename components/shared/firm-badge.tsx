import { cn } from '@/lib/utils'
import type { Firm } from '@/lib/types'

interface FirmBadgeProps {
  firm: Firm
  className?: string
  size?: 'sm' | 'md'
}

export function FirmBadge({ firm, className, size = 'md' }: FirmBadgeProps) {
  const isSmall = size === 'sm'

  if (firm === 'mia') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded font-sans font-medium',
          isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
          'bg-surface-sunken text-ink border border-surface/28',
          className
        )}
      >
        Corporativo
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-sans font-medium',
        isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        'bg-ok/8 text-ok border border-ok/40',
        className
      )}
    >
      Ambiental
    </span>
  )
}
