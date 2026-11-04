import { GuideLinks, RegWatchGuide } from '@/components/onboarding/regwatch-guide'

export default function GuiaPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <p role="heading" aria-level={1} className="text-display-md text-ink">Cómo crear un asunto desde RegWatch</p>
        <p className="text-body-lg text-ink-muted">De la publicación oficial a una persona de tu equipo con un plazo claro.</p>
      </header>
      <section className="rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
        <RegWatchGuide />
      </section>
      <GuideLinks />
    </div>
  )
}
