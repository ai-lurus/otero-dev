'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CountedTextarea } from '@/components/ui/counted-textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MonitoringStep, fieldClass, labelClass, type MonitoringSuggestions } from '@/components/onboarding/monitoring-step'
import { DocumentsStep } from '@/components/onboarding/documents-step'
import { SuggestedTag } from '@/components/onboarding/suggested-tag'
import { useAnalysisPolling } from '@/app/cliente/documentos/use-analysis-polling'
import { buildProposal } from '@/lib/onboarding-proposal'
import { TRIGGERS } from '@/lib/monitoring-profile'
import type { DocumentRow } from '@/lib/db/schema'
import { RegWatchGuide } from '@/components/onboarding/regwatch-guide'
import { completeOnboarding, type OnboardingState } from '@/app/actions/onboarding'
import { profileStatus, PROFILE_STATUS_LABELS, type MonitoringFields } from '@/lib/monitoring-profile'
import {
  COMPANY_LIMITS, DEMO_COMPANY, DEMO_MONITORING, EMPTY_COMPANY, ONBOARDING_STEPS, companyReady, type CompanyFields,
} from '@/lib/onboarding'
import { cn } from '@/lib/utils'

const COMPANY_FIELDS: { key: keyof CompanyFields; label: string; placeholder: string; long?: boolean }[] = [
  { key: 'description', label: 'A qué se dedica tu empresa', placeholder: 'Fabricamos…', long: true },
  { key: 'activities', label: 'Actividades principales', placeholder: 'Producción, almacenamiento, importación…', long: true },
  { key: 'industry', label: 'Industria', placeholder: 'Industria química' },
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
  const [docs, setDocs] = useState<DocumentRow[]>(state.documents)
  // Lo que el cliente ya tocó a mano: sobre eso, los documentos no proponen nada.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [isPending, startTransition] = useTransition()

  const upsert = (doc: DocumentRow) =>
    setDocs(prev => (prev.some(d => d.id === doc.id) ? prev.map(d => (d.id === doc.id ? doc : d)) : [doc, ...prev]))
  useAnalysisPolling(docs, rows => rows.forEach(upsert))

  const proposal = useMemo(() => buildProposal(docs, state.today), [docs, state.today])
  const touch = (...keys: string[]) => setTouched(prev => new Set([...prev, ...keys]))

  // Valores que ve el cliente: lo suyo manda; lo vacío lo llenan los documentos.
  const companyView = useMemo<CompanyFields>(() => {
    const out = { ...company }
    for (const key of ['description', 'activities', 'industry', 'certifications', 'riesgos'] as const) {
      const suggestion = proposal.company[key]
      if (!touched.has(key) && !company[key].trim() && suggestion) out[key] = suggestion
    }
    return out
  }, [company, proposal, touched])

  const monitoringView = useMemo<MonitoringFields>(() => {
    const triggers = { ...monitoring.triggers }
    for (const t of TRIGGERS) {
      const suggestion = proposal.triggers[t.key]
      const own = triggers[t.key]
      if (suggestion && !touched.has(`t:${t.key}`) && (!own || own === 'no')) triggers[t.key] = suggestion
    }
    return {
      ...monitoring,
      scian: touched.has('scian') ? monitoring.scian : monitoring.scian ?? proposal.scian,
      stateList: touched.has('states') || monitoring.stateList?.length ? monitoring.stateList : proposal.stateList,
      triggers,
    }
  }, [monitoring, proposal, touched])

  const suggested = useMemo(() => {
    const fields = new Set((Object.keys(proposal.company) as (keyof CompanyFields)[])
      .filter(k => !touched.has(k) && companyView[k] === proposal.company[k]))
    const triggers: NonNullable<MonitoringSuggestions['triggers']> = {}
    for (const t of TRIGGERS) {
      if (proposal.triggers[t.key] && !touched.has(`t:${t.key}`) && monitoringView.triggers?.[t.key] === proposal.triggers[t.key]) {
        triggers[t.key] = proposal.triggerSources[t.key] ?? []
      }
    }
    const monitoringSuggestions: MonitoringSuggestions = {
      scian: proposal.scian && !touched.has('scian') && monitoringView.scian === proposal.scian ? proposal.fieldSources.scian ?? [] : undefined,
      states: proposal.stateList.length && !touched.has('states') && monitoringView.stateList === proposal.stateList ? proposal.fieldSources.states ?? [] : undefined,
      triggers,
    }
    return { fields, monitoring: monitoringSuggestions }
  }, [proposal, touched, companyView, monitoringView])

  const status = profileStatus(monitoringView)
  const current = ONBOARDING_STEPS[step].id
  const canAdvance = current === 'empresa' ? companyReady(companyView)
    : current === 'monitoreo' ? Boolean(monitoringView.scian && monitoringView.stateList?.length) : true

  function changeMonitoring(next: MonitoringFields) {
    const changed: string[] = []
    if (next.scian !== monitoringView.scian) changed.push('scian')
    if (next.stateList !== monitoringView.stateList) changed.push('states')
    for (const t of TRIGGERS) if (next.triggers?.[t.key] !== monitoringView.triggers?.[t.key]) changed.push(`t:${t.key}`)
    if (changed.length) touch(...changed)
    setMonitoring(next)
  }
  const isLast = step === ONBOARDING_STEPS.length - 1

  function fillDemoData() {
    setCompany(DEMO_COMPANY)
    setMonitoring(DEMO_MONITORING)
    touch('description', 'activities', 'industry', 'certifications', 'riesgos', 'scian', 'states', ...TRIGGERS.map(t => `t:${t.key}`))
    setError(null)
  }

  function finish() {
    setError(null)
    startTransition(async () => {
      try {
        await completeOnboarding({ company: companyView, monitoring: monitoringView })
        setFinished(true)
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo guardar tu alta')
      }
    })
  }

  if (finished) return <Finished tenantName={state.tenantName} pendingDocs={docs.filter(d => d.analysisStatus === 'detected').length} />

  return (
    <div className="space-y-8">
      <Stepper step={step} onJump={i => i < step && setStep(i)} />

      <section className="space-y-6 rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-heading text-ink">{ONBOARDING_STEPS[step].label}</h3>
            <p className="text-body-sm text-ink-muted">{ONBOARDING_STEPS[step].hint}</p>
          </div>
          {step < 3 && (
            <Button variant="ghost" size="sm" onClick={fillDemoData}>
              <Sparkles aria-hidden /> Llenar con datos de ejemplo
            </Button>
          )}
        </header>

        {current === 'documentos' && (
          <DocumentsStep tenantId={state.tenantId} docs={docs} proposal={proposal} onUpsert={upsert} />
        )}

        {current === 'empresa' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {COMPANY_FIELDS.map(f => (
              <div key={f.key} className={cn('flex flex-col gap-2', f.long && 'sm:col-span-2')}>
                <label className={labelClass} htmlFor={`ob-${f.key}`}>{f.label}</label>
                {suggested.fields.has(f.key) && <SuggestedTag sources={proposal.fieldSources[f.key] ?? []} />}
                {f.long ? (
                  <CountedTextarea id={`ob-${f.key}`} rows={4} placeholder={f.placeholder} maxLength={COMPANY_LIMITS[f.key]}
                    value={companyView[f.key]} onChange={e => { touch(f.key); setCompany({ ...company, [f.key]: e.target.value }) }} />
                ) : (
                  <input id={`ob-${f.key}`} className={fieldClass} maxLength={COMPANY_LIMITS[f.key]} placeholder={f.placeholder}
                    value={companyView[f.key]} onChange={e => { touch(f.key); setCompany({ ...company, [f.key]: e.target.value }) }} />
                )}
              </div>
            ))}
          </div>
        )}

        {current === 'monitoreo' && (
          <>
            <Alert variant={status === 'completo' ? 'ok' : 'info'}>
              <AlertDescription>
                {PROFILE_STATUS_LABELS[status]}. {proposal.answered > 0
                  ? `Con tus documentos ya contestamos ${proposal.answered} de ${proposal.total} preguntas; revísalas y completa el resto.`
                  : 'Con la actividad y los estados ya te llega lo de tu sector; contesta las preguntas para afinar las materias.'}
              </AlertDescription>
            </Alert>
            <MonitoringStep value={monitoringView} onChange={changeMonitoring} suggestions={suggested.monitoring} />
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
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
              <span className="leading-tight">{s.label}</span>
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

function Finished({ tenantName, pendingDocs }: { tenantName: string; pendingDocs: number }) {
  return (
    <section className="space-y-6 rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
      <Alert variant="ok"><Check aria-hidden /><AlertDescription>Listo. El perfil de {tenantName} quedó confirmado y RegWatch ya filtra con él.</AlertDescription></Alert>
      <div>
        <h3 className="text-heading text-ink">Tu primer asunto</h3>
        <p className="text-body-sm text-ink-muted">Abre la bandeja, elige un aviso y asígnalo a alguien de tu equipo. Si aún no tienes avisos, crea uno desde una noticia.</p>
      </div>
      {pendingDocs > 0 && (
        <Alert variant="info">
          <AlertDescription>
            Tienes {pendingDocs} {pendingDocs === 1 ? 'documento' : 'documentos'} por confirmar. <Link href="/cliente/documentos" className="font-medium underline underline-offset-4">Revisa lo que Otero detectó</Link> para que también alimente el seguimiento de vencimientos.
          </AlertDescription>
        </Alert>
      )}
      <RegWatchGuide compact />
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild><Link href="/cliente/obligaciones">Ir a la bandeja</Link></Button>
        <Link href="/cliente/noticias" className="text-body-sm font-medium text-brand-text underline-offset-4 hover:underline">Ver noticias</Link>
      </div>
    </section>
  )
}
