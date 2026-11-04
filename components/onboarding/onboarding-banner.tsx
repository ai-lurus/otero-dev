import Link from 'next/link'
import { ArrowRight, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Aviso en el inicio mientras el admin del cliente no termine su alta.
export function OnboardingBanner() {
  return (
    <div className="px-4 pt-4 sm:px-6 xl:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-brand-tint px-6 py-4">
        <div className="flex items-start gap-3">
          <ClipboardList aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-text" strokeWidth={1.75} />
          <div>
            <p className="text-body-sm font-medium text-ink">Termina el alta de tu empresa</p>
            <p className="text-caption text-ink-muted">Cuatro pasos para que RegWatch te mande solo lo que te toca y sepas cómo asignar tu primer asunto.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/cliente/bienvenida">Empezar <ArrowRight aria-hidden /></Link>
        </Button>
      </div>
    </div>
  )
}
