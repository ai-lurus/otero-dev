import Link from 'next/link'
import { CheckCircle2, FilePlus2, Inbox, Newspaper, Radar, UserCheck } from 'lucide-react'
import { Cite, StatusTag } from '@/components/ui/status-tag'
import { cn } from '@/lib/utils'

// Guía de cómo una publicación se vuelve un asunto con responsable. La usan el
// último paso del alta y la página /cliente/guia.

const STEPS = [
  {
    icon: Radar,
    title: 'Otero lee las fuentes por ti',
    body: 'Cada día RegWatch revisa el DOF, los proyectos de la PIGR y las salas de prensa de las dependencias. Cruza cada publicación con tu perfil: actividad, estados y operación.',
  },
  {
    icon: Inbox,
    title: 'Lo que aplica a tu empresa llega a tu bandeja',
    body: 'En RegWatch, Bandeja · sin revisar, ves cada aviso con su fuente, la materia, el impacto y el plazo. Tu despacho revisa los borradores antes de enviártelos.',
  },
  {
    icon: Newspaper,
    title: 'O ábrelo tú desde una noticia',
    body: 'En Noticias está el boletín de comunicados. Si una nota te afecta, usa Crear asunto: Otero redacta el borrador con tu perfil y lo deja en tu bandeja.',
  },
  {
    icon: UserCheck,
    title: 'Acepta y asigna un responsable',
    body: 'Marca el asunto y usa Atender. Elige a una persona en Asignar a y confirma con Aceptar y asignar: pasa a Mi cumplimiento, en Por hacer y ya con responsable.',
  },
  {
    icon: CheckCircle2,
    title: 'Tu equipo lo lleva a cumplido',
    body: 'Quien lo tiene asignado agrega notas y evidencia. Todo queda en la historia del asunto, con fecha y autor.',
  },
] as const

export function RegWatchGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-8">
      <ol className="space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised text-ink">
              <step.icon aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-body-sm font-medium text-ink">
                <span className="text-ink-muted">{i + 1}. </span>{step.title}
              </p>
              {!compact && <p className="text-body-sm text-ink-muted">{step.body}</p>}
            </div>
          </li>
        ))}
      </ol>
      <ExampleItem />
    </div>
  )
}

/** Así se ve un asunto en la bandeja. Ejemplo ilustrativo, no un aviso real. */
function ExampleItem() {
  return (
    <figure className="space-y-2">
      <figcaption className="text-label text-ink-muted">Ejemplo de asunto en tu bandeja</figcaption>
      <div className="space-y-3 rounded-lg border border-border bg-surface-raised p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag status="warn" />
          <Cite>DOF 15/10/2026 · NOM-052-SEMARNAT</Cite>
        </div>
        <p className="text-heading text-ink">Cambia la clasificación de residuos peligrosos por fuente específica</p>
        <p className="text-body-sm text-ink-muted">
          Como gran generador, tendrías que actualizar tu plan de manejo y tu registro ante SEMARNAT. Revisa con tu abogado el plazo de transición.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <span className="text-caption text-ink-muted">Ambiental · Impacto alto</span>
          <span className={cn('inline-flex items-center gap-2 text-body-sm font-medium text-ink')}>
            <FilePlus2 aria-hidden className="size-4" /> Atender
          </span>
        </div>
      </div>
    </figure>
  )
}

export function GuideLinks() {
  return (
    <div className="flex flex-wrap gap-3 text-body-sm">
      <Link href="/cliente/obligaciones" className="font-medium text-brand-text underline-offset-4 hover:underline">Ir a la bandeja de RegWatch</Link>
      <Link href="/cliente/noticias" className="font-medium text-brand-text underline-offset-4 hover:underline">Ver noticias</Link>
    </div>
  )
}
