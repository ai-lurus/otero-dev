import { redirect } from 'next/navigation'
import { getDemoTour } from '@/app/actions/demo-tour'
import DemoTour from './demo-tour'

export default async function DemoPage({ searchParams }: { searchParams: Promise<{ tenant?: string }> }) {
  const { tenant } = await searchParams
  const state = await getDemoTour(tenant).catch(() => null)
  if (!state) redirect('/admin')

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <p role="heading" aria-level={1} className="text-display-md text-ink">Recorrido del demo</p>
        <p className="text-body-lg text-ink-muted">
          De una empresa recién registrada a su primer asunto asignado. Cada paso se marca solo cuando ya pasó en la base.
        </p>
      </header>
      <DemoTour state={state} />
    </div>
  )
}
