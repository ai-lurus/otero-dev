'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ClienteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[v0] Error en el portal cliente')
  }, [])

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <section className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">No pudimos cargar esta sección</h1>
          <p className="text-sm leading-6 text-muted-foreground">Ocurrió un error temporal. Tus datos no se han eliminado.</p>
        </div>
        <Button onClick={reset} className="min-h-11"><RefreshCw data-icon="inline-start" />Reintentar</Button>
      </section>
    </main>
  )
}

export const dynamic = 'force-dynamic'
