'use client'

import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type Props = {
  label: string | null | undefined
  /** Solo se muestra cuando el menú está en riel de íconos y la etiqueta no se ve. */
  show: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  children: ReactNode
}

/** Tooltip con el nombre de un ícono del menú. Sin riel, deja pasar el hijo tal cual. */
export function RailTip({ label, show, side = 'right', children }: Props) {
  if (!show || !label) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  )
}
