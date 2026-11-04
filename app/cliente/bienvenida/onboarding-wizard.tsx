'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MonitoringStep, fieldClass, labelClass } from '@/components/onboarding/monitoring-step'
import { RegWatchGuide } from '@/components/onboarding/regwatch-guide'
import { completeOnboarding, type OnboardingState } from '@/app/actions/onboarding'
import { profileStatus, PROFILE_STATUS_LABELS, type MonitoringFields } from '@/lib/monitoring-profile'
import {
  DEMO_COMPANY, DEMO_MONITORING, EMPTY_COMPANY, ONBOARDING_STEPS, companyReady, type CompanyFields,
} from '@/lib/onboarding'
import { cn } from '@/lib/utils'

const COMPANY_FIELDS: { key: keyof CompanyFields; label: string; placeholder: string; long?: boolean }[] = [
  { key: 'description', label: 'A qué se dedica tu empresa', placeholder: 'Fabricamos…', long: true },
  { key: 'activities', label: 'Actividades principales', placeholder: 'Producción, almacenamiento, importación…', long: true },
  { key: 'industry', label: 'Industria', placeholder: 'Industria química' },
  { key: 'states', label: 'Plantas u oficinas', placeholder: 'Planta en Celaya, oficinas en Querétaro' },
  { key: 'certifications', label: 'Certificaciones vigentes', placeholder: 'ISO 14001, Industria Limpia' },
  { key: 'riesgos', label: 'Riesgos regulatorios que ya conoces', placeholder: 'Residuos peligrosos, emisiones…', long: true },
]

const ROLE_LABEL: Record<string, string> = { tenant_admin: 'Administrador', client: 'Equipo' }

export default function OnboardingWizard({ state }: { state: OnboardingState }) {
  const router = useRouter()
  const p = state.profile
  const [step, setStep] = useState(0)
  const [company, setCompany] = useState<CompanyFields>({
    ...EMPTY_COMPANY,
    ...(p ? { description: p.description, industry: p.industry, employees: p.employees, states: p.states, activities: p.activities, certifications: p.certifications, riesgos: p.riesgos } : {}),
  })
  const [monitoring, setMonitoring] = useState<MonitoringFields>({
    scian: p?.scian ?? null, stateList: p?.stateList ?? [], triggers: p?.triggers ?? {}, employees: p?.employees || null,
  })
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [isPending, startTransition] = useTransition()

  const status = profileStatus(monitoring)
  const current = ONBOARDING_STEPS[step].id
  const canAdvance = current === 'empresa' ? companyReady(company)
    : current === 'monitoreo' ? Boolean(monitoring.scian && monitoring.stateList?.length) : true
  const isLast = step === ONBOARDING_STEPS.length - 1

  function fillDemoData() {
    setCompany(DEMO_COMPANY)
    setMonitoring(DEMO_MONITORING)
    setError(null)
  }

  function finish() {
    setError(null)
    startTransition(async () => {
      try {
        await completeOnboarding({ company, monitoring })
        setFinished(true)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo guardar tu alta')
      }
    })
  }

  if (finished) return <Finished tenantName={state.tenantName} />

  return (
    <div className="space-y-8">
      <Stepper step={step} onJump={i => i < step && setStep(i)} />

      <section className="space-y-6 rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-heading text-ink">{ONBOARDING_STEPS[step].label}</h3>
            <p className="text-body-sm text-ink-muted">{ONBOARDING_STEPS[step].hint}</p>
          </div>
          {step < 2 && (
            <Button variant="ghost" size="sm" onClick={fillDemoData}>
              <Sparkles aria-hidden /> Llenar con datos de ejemplo
            </Button>
          )}
        </header>

        {current === 'empresa' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {COMPANY_FIELDS.map(f => (
              <div key={f.key} className={cn('flex flex-col gap-2', f.long && 'sm:col-span-2')}>
                <label className={labelClass} htmlFor={`ob-${f.key}`}>{f.label}</label>
                {f.long ? (
                  <textarea id={`ob-${f.key}`} rows={2} className={fieldClass} placeholder={f.placeholder}
                    value={company[f.key]} onChange={e => setCompany({ ...company, [f.key]: e.target.value })} />
                ) : (
                  <input id={`ob-${f.key}`} className={fieldClass} placeholder={f.placeholder}
                    value={company[f.key]} onChange={e => setCompany({ ...company, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        )}

        {current === 'monitoreo' && (
          <>
            <Alert variant={status === 'completo' ? 'ok' : 'info'}>
              <AlertDescription>
                {PROFILE_STATUS_LABELS[status]}. Con la actividad y los estados ya te llega lo de tu sector; contesta las preguntas para afinar las materias.
              </AlertDescription>
            </Alert>
            <MonitoringStep value={monitoring} onChange={setMonitoring} />
          </>
        )}

        {current === 'equipo' && <TeamStep team={state.team} />}

        {current === 'regwatch' && <RegWatchGuide />}

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <Button variant="ghost" disabled={step === 0 || isPending} onClick={() => setStep(step - 1)}>
            <ArrowLeft aria-hidden /> Regresar
          </Button>
          {!canAdvance && <span className="text-caption text-ink-muted">
            {current === 'empresa' ? 'Describe tu empresa y sus actividades para continuar.' : 'Elige un sector y al menos un estado para continuar.'}
          </span>}
          {isLast ? (
            <Button disabled={isPending} onClick={finish}>
              <Check aria-hidden /> {isPending ? 'Guardando…' : 'Confirmar y terminar'}
            </Button>
          ) : (
            <Button disabled={!canAdvance} onClick={() => setStep(step + 1)}>
              Continuar <ArrowRight aria-hidden />
            </Button>
          )}
        </footer>
      </section>
    </div>
  )
}

function Stepper({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ONBOARDING_STEPS.map((s, i) => {
        const done = i < step
        return (
          <li key={s.id}>
            <button type="button" onClick={() => onJump(i)} disabled={i >= step} aria-current={i === step ? 'step' : undefined}
              className={cn('flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-label',
                i === step ? 'border-ink bg-surface-raised text-ink' : done ? 'border-border text-ink hover:bg-surface-sunken' : 'border-border text-ink-muted')}>
              <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-pill text-caption',
                done ? 'bg-ok-tint text-ok' : i === step ? 'bg-ink text-surface' : 'bg-surface-sunken text-ink-muted')}>
                {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
              </span>
              <span className="truncate">{s.label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function TeamStep({ team }: { team: OnboardingState['team'] }) {
  return (
    <div className="space-y-4">
      <p className="text-body-sm text-ink-muted">
        Los asuntos se asignan a personas de tu empresa. Revisa quién tiene acceso; puedes sumar más desde Usuarios cuando quieras.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {team.map(m => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-ink">{m.name}</p>
              <p className="text-caption text-ink-muted">{m.email}</p>
            </div>
            <span className="rounded-pill bg-surface-sunken px-3 py-1 text-label text-ink">{ROLE_LABEL[m.role] ?? m.role}</span>
          </li>
        ))}
      </ul>
      {team.length < 2 && (
        <Alert variant="warn"><AlertDescription>Por ahora solo estás tú. Agrega al menos a una persona para poder asignarle asuntos.</AlertDescription></Alert>
      )}
      <Button variant="outline" asChild>
        <Link href="/cliente/usuarios" target="_blank"><Users aria-hidden /> Agregar personas</Link>
      </Button>
    </div>
  )
}

function Finished({ tenantName }: { tenantName: string }) {
  return (
    <section className="space-y-6 rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
      <Alert variant="ok"><Check aria-hidden /><AlertDescription>Listo. El perfil de {tenantName} quedó confirmado y RegWatch ya filtra con él.</AlertDescription></Alert>
      <div>
        <h3 className="text-heading text-ink">Tu primer asunto</h3>
        <p className="text-body-sm text-ink-muted">Abre la bandeja, elige un aviso y asígnalo a alguien de tu equipo. Si aún no tienes avisos, crea uno desde una noticia.</p>
      </div>
      <RegWatchGuide compact />
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild><Link href="/cliente/obligaciones">Ir a la bandeja</Link></Button>
        <Link href="/cliente/noticias" className="text-body-sm font-medium text-brand-text underline-offset-4 hover:underline">Ver noticias</Link>
      </div>
    </section>
  )
}
