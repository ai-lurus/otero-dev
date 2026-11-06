'use client'

import { useEffect } from 'react'

export type ToastState = { message: string; onUndo?: () => void }

const DISMISS_MS = 6000

/** Aviso al pie tras mover un asunto, con Deshacer. Se cierra solo a los 6 segundos. */
export function BoardToast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(onClose, DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null
  return (
    <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-6 z-50 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-4 rounded-md bg-ink px-4 py-3 text-body-sm text-surface shadow-lg">
      <span>{toast.message}</span>
      <div className="flex items-center gap-3">
        {toast.onUndo && (
          <button type="button" onClick={toast.onUndo} className="font-medium underline underline-offset-4 focus-visible:outline-surface">
            Deshacer
          </button>
        )}
        <button type="button" onClick={onClose} className="text-surface/70 hover:text-surface focus-visible:outline-surface">
          Cerrar
        </button>
      </div>
    </div>
  )
}
