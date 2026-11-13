import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getOnboardingState } from '@/app/actions/onboarding'
import { RegWatchGuide } from '@/components/onboarding/regwatch-guide'
import OnboardingWizard from './onboarding-wizard'

// Alta del cliente por pasos. El admin de la empresa la llena; el resto del
// equipo ve la guía de cómo llegan y se atienden los asuntos.
export default async function BienvenidaPage() {
  const state = await getOnboardingState().catch(() => null)
  if (!state) redirect('/cliente')

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <p className="text-label text-ink-muted">Alta de {state.tenantName}</p>
        <p role="heading" aria-level={1} className="text-display-md text-ink">Configura Otero para tu empresa</p>
        <p className="text-body-lg text-ink-muted">
          {state.isAdmin
            ? 'Sube los documentos de tu empresa y Otero los lee para contestar por ti. Tú solo confirmas o corriges, y con eso RegWatch decide qué publicaciones te aplican.'
            : 'Así funciona Otero en tu empresa: de la publicación oficial al asunto con responsable.'}
        </p>
        {state.done && state.isAdmin && (
          <p className="text-body-sm text-ink-muted">Ya confirmaste tu alta. Si cambias algo y vuelves a confirmar, RegWatch usa los datos nuevos. <Link href="/cliente" className="text-brand-text underline-offset-4 hover:underline">Volver al inicio</Link></p>
        )}
      </header>
      {state.isAdmin ? <OnboardingWizard state={state} /> : (
        <section className="rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
          <RegWatchGuide />
        </section>
      )}
    </div>
  )
}
