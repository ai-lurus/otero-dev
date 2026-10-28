import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Registra la escala tipográfica y el radio pill del design system para que
// `cn('text-body-sm', 'text-ink')` conserve ambas clases (tamaño y color).
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display-xl',
        'display-lg',
        'display-md',
        'heading',
        'body-lg',
        'body',
        'body-sm',
        'label',
        'caption',
        'cite',
        'data',
      ],
      radius: ['pill'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
