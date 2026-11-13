'use client'

import { useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Building2, Check, Circle, ExternalLink, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createDemoTenant, createDemoUsers, type DemoTourState } from '@/app/actions/demo-tour'
import { PROFILE_STATUS_LABELS } from '@/lib/monitoring-profile'
import { cn } from '@/lib/utils'

type Step = {
  id: string
  title: string
  done: boolean | null // null = paso para mostrar, sin estado
  say: string
  body: ReactNode
  action?: ReactNode
}

const linkClass = 'inline-flex items-center gap-1 font-medium text-brand-text underline-offset-4 hover:underline'

function A({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <Link href={href} className={linkClass} target={external ? '_blank' : undefined}>
      {children}{external && <ExternalLink aria-hidden className="size-3.5" />}
    </Link>
  )
}

export default function DemoTour({ state }: { state: DemoTourState }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { tenant, users, profile, regwatch, firstAssigned, firstSent, canPrepare } = state
  const admin = users.find(u => u.role === 'tenant_admin')
  const slug = tenant?.slug

  function run(fn: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo completar el paso')
      }
    })
  }

  const steps: Step[] = [
    {
      id: 'empresa',
      title: 'Registra la empresa',
      done: Boolean(tenant),
      say: 'Dar de alta a un cliente toma un minuto: razón social, RFC e industria. Cada empresa es un espacio aparte con sus propios datos.',
      body: tenant
        ? <p>{tenant.name}{tenant.rfc ? ` · RFC ${tenant.rfc}` : ''}{slug ? ` · /login/${slug}` : ''}</p>
        : <p>Regístrala en <A href="/admin/tenants">Empresas</A> con Nueva empresa, o usa la empresa ficticia del demo.</p>,
      action: !tenant && canPrepare && (
        <Button disabled={isPending} onClick={() => run(async () => router.push(`/admin/demo?tenant=${await createDemoTenant()}`))}>
          <Building2 aria-hidden /> Registrar Química del Bajío
        </Button>
      ),
    },
    {
      id: 'equipo',
      title: 'Crea su equipo',
      done: tenant ? Boolean(admin) && users.length >= 2 : false,
      say: 'El cliente tiene un administrador que decide y personas a quienes asigna los asuntos. Cada quien entra con su correo.',
      body: users.length ? (
        <ul className="space-y-1">
          {users.map(u => (
            <li key={u.id} className="flex flex-wrap gap-x-2">
              <span className="text-data text-ink">{u.email}</span>
              <span className="text-ink-muted">{u.name} · {u.role === 'tenant_admin' ? 'Administrador' : 'Equipo'}</span>
            </li>
          ))}
          <li className="text-caption text-ink-muted">Contraseña de las cuentas demo: la de DEMO_PASSWORD. También con <span className="text-data">pnpm demo:users {slug ?? '<slug>'}</span>.</li>
        </ul>
      ) : <p>Crea un administrador y dos personas de equipo. Sus correos terminan en .demo.</p>,
      action: tenant && canPrepare && (!admin || users.length < 2) && (
        <Button disabled={isPending} onClick={() => run(() => createDemoUsers(tenant.id))}>
          <UserPlus aria-hidden /> Crear usuarios demo
        </Button>
      ),
    },
    {
      id: 'admin',
      title: 'Muéstrala en el admin',
      done: null,
      say: 'Desde aquí el despacho ve a todos sus clientes, sus usuarios y qué le vigila a cada uno.',
      body: tenant ? (
        <div className="flex flex-wrap gap-4">
          <A href="/admin/tenants">Lista de empresas</A>
          <A href={`/admin/tenants/${tenant.id}/perfil`}>Perfil de monitoreo · {PROFILE_STATUS_LABELS[profile.status]}</A>
          <A href="/admin/users">Usuarios</A>
        </div>
      ) : <p>Disponible cuando registres la empresa.</p>,
    },
    {
      id: 'alta',
      title: 'El cliente completa su alta',
      done: Boolean(profile.confirmedAt),
      say: 'El primer día el cliente cuenta a qué se dedica y dónde opera. Con eso Otero decide qué le aplica.',
      body: (
        <ol className="list-decimal space-y-1 pl-4">
          <li>Abre una ventana privada y entra en {slug ? <A href={`/login/${slug}`} external>/login/{slug}</A> : '/sign-in'} como <span className="text-data">{admin?.email ?? 'el administrador del cliente'}</span>.</li>
          <li>En el inicio aparece Termina el alta de tu empresa. Usa Llenar con datos de ejemplo y avanza los cuatro pasos.</li>
          <li>El último paso explica cómo un aviso se vuelve asunto. Termina con Confirmar y terminar.</li>
        </ol>
      ),
    },
    {
      id: 'regwatch',
      title: 'Le llegan noticias y avisos de RegWatch',
      done: tenant ? regwatch.matches + regwatch.drafts + regwatch.sent > 0 || regwatch.news > 0 : false,
      say: 'Cada día Otero lee el DOF y las salas de prensa, y cruza cada publicación con el perfil del cliente. Solo le llega lo que le aplica, con su fuente.',
      body: (
        <div className="space-y-2">
          <p>
            {regwatch.matches} publicaciones le aplican · {regwatch.drafts} borradores sin enviar · {regwatch.sent} asuntos enviados · {regwatch.news} noticias en el boletín
          </p>
          <div className="flex flex-wrap gap-4">
            <A href="/admin/ingesta">Ingesta: publicaciones y a quién aplican</A>
            <A href="/admin/noticias">Noticias del despacho</A>
          </div>
          <p className="text-caption text-ink-muted">Del lado del cliente: Noticias muestra el boletín y RegWatch, la bandeja de asuntos.</p>
        </div>
      ),
    },
    {
      id: 'asunto',
      title: 'Genera su primer asunto',
      done: regwatch.sent > 0,
      say: 'Un aviso se vuelve asunto con impacto, plazo y fundamento. Lo propone Otero y lo revisa el despacho, o lo abre el propio cliente desde una noticia.',
      body: (
        <div className="space-y-2">
          <p><span className="font-medium text-ink">Desde el despacho:</span> en <A href="/admin/ingesta">Ingesta</A> elige una publicación, marca la empresa y usa Generar obligaciones. Luego, en <A href="/admin/obligaciones">Asuntos regulatorios</A>, usa Enviar al cliente.</p>
          <p><span className="font-medium text-ink">Desde el cliente:</span> como administrador, en Noticias usa Crear asunto en una nota. Llega directo a su bandeja.</p>
          {firstSent && <p className="text-ink">Primer asunto enviado: {firstSent.title}</p>}
        </div>
      ),
    },
    {
      id: 'asignar',
      title: 'Lo asigna a una persona',
      done: Boolean(firstAssigned),
      say: 'El administrador decide qué atender y a quién se lo encarga. Desde ese momento hay responsable, estado y evidencia.',
      body: (
        <div className="space-y-2">
          <p>Como administrador del cliente: RegWatch, Bandeja · sin revisar. Marca el asunto, usa Atender, elige a alguien en Asignar a y confirma con Aceptar y asignar. Sale de la bandeja y pasa a Mi cumplimiento, en Por hacer.</p>
          <p>Para cerrar, entra como <span className="text-data">{users.find(u => u.role === 'client')?.email ?? 'una persona del equipo'}</span> y muestra que el asunto ya está en su lista.</p>
          {firstAssigned && <p className="text-ink">Asignado: {firstAssigned.title} · {firstAssigned.owner ?? 'sin nombre'}</p>}
        </div>
      ),
    },
  ]

  const nextId = steps.find(s => s.done === false)?.id

  return (
    <div className="space-y-6">
      <TenantPicker state={state} />
      {!canPrepare && (
        <Alert variant="info"><AlertDescription>Los atajos para registrar la empresa y crear usuarios solo aparecen para superadmin con DEMO_MODE activo.</AlertDescription></Alert>
      )}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.id} className={cn('rounded-lg border bg-surface-raised p-6 shadow-sm', s.id === nextId ? 'border-ink' : 'border-border')}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <StepMark done={s.done} n={i + 1} />
                <div>
                  <h3 className="text-heading text-ink">{s.title}</h3>
                  <p className="text-caption text-ink-muted">{s.done === null ? 'Para mostrar' : s.done ? 'Hecho' : s.id === nextId ? 'Siguiente' : 'Pendiente'}</p>
                </div>
              </div>
              {s.id === nextId && s.action}
            </div>
            <div className="mt-4 space-y-3 pl-12 text-body-sm text-ink-muted">
              {s.body}
              <p className="border-l-2 border-border pl-3 italic">Qué decir: {s.say}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function StepMark({ done, n }: { done: boolean | null; n: number }) {
  if (done) {
    return <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-ok-tint text-ok" aria-label="Hecho"><Check aria-hidden className="size-4" /></span>
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-sunken text-label text-ink" aria-label={done === null ? 'Para mostrar' : 'Pendiente'}>
      {done === null ? <Circle aria-hidden className="size-3.5" /> : n}
    </span>
  )
}

function TenantPicker({ state }: { state: DemoTourState }) {
  const router = useRouter()
  if (!state.tenants.length) return null
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="demo-tenant" className="text-label text-ink">Empresa del demo</label>
      <select id="demo-tenant" value={state.tenant?.id ?? ''} onChange={e => router.push(`/admin/demo?tenant=${e.target.value}`)}
        className="min-w-64 rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-body-sm text-ink">
        {!state.tenant && <option value="">Elige una empresa</option>}
        {state.tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  )
}
