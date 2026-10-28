'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { updateItemStatus, type RegulatoryItem } from '@/app/actions/regulatory-items'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Cite, DeadlineChip } from '@/components/ui/status-tag'
import { DIRECTION_LABELS, IMPACT_LABELS, STAGE_LABELS, STATUS_LABELS } from '@/lib/regulatory'
import { bandOf, deadlineLabel } from '@/lib/inbox'
import { LEGAL_OBJECTS, isLegalObject } from '@/lib/legal-objects'
import { BandTag, sourceCite } from './band-tag'

type Props = {
  item: RegulatoryItem | null
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-label text-ink-muted">{title}</h3>
      <div className="text-body-sm text-ink whitespace-pre-line">{children}</div>
    </section>
  )
}

/** Panel lateral derecho con el asunto abierto y sus decisiones. */
export function InboxPanel({ item, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [discarding, setDiscarding] = useState(false)
  const [reason, setReason] = useState('')

  const reset = () => {
    setError('')
    setDiscarding(false)
    setReason('')
  }

  const decide = (status: string, why?: string) => {
    if (!item) return
    setError('')
    startTransition(async () => {
      try {
        await updateItemStatus(item.id, status, why)
        router.refresh()
        reset()
        onClose()
      } catch (error) {
        console.error('updateItemStatus', item.id, error)
        setError('No se pudo actualizar el asunto. Intenta de nuevo.')
      }
    })
  }

  const band = item ? bandOf(item) : null
  const deadline = item ? deadlineLabel(item.dueDate) : null
  const meta = item
    ? [item.authority, item.instrumentType, item.stage ? STAGE_LABELS[item.stage] ?? item.stage : null, item.materia].filter(Boolean)
    : []

  return (
    <Sheet open={!!item} onOpenChange={(open) => { if (!open) { reset(); onClose() } }}>
      <SheetContent className="w-full gap-0 bg-surface-raised p-0 shadow-none sm:max-w-xl">
        {item && band && (
          <>
            <SheetHeader className="gap-3 border-b border-border p-6 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <BandTag band={band} />
                <Cite>{sourceCite(item)}</Cite>
                {deadline && <DeadlineChip>{deadline}</DeadlineChip>}
              </div>
              <SheetTitle asChild className="text-heading text-ink"><p>{item.title}</p></SheetTitle>
              <SheetDescription className="text-body-sm text-ink-muted">{meta.join(' · ')}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {item.description && <Section title="Resumen">{item.description}</Section>}
              {item.impactRationale && (
                <Section title={[item.impact && IMPACT_LABELS[item.impact], item.impactDirection && DIRECTION_LABELS[item.impactDirection]].filter(Boolean).join(' · ') || 'Impacto'}>
                  {item.impactRationale}
                </Section>
              )}
              {item.generatesObligation && item.obligationDetail && <Section title="Qué te obliga a hacer">{item.obligationDetail}</Section>}
              {!!item.objects?.length && (
                <Section title="Objetos">
                  <ul className="flex flex-col gap-2">
                    {item.objects.filter((object) => isLegalObject(object.tipo)).map((object, index) => (
                      <li key={`${object.tipo}-${index}`} className="flex flex-col gap-1">
                        <span className="font-medium">{LEGAL_OBJECTS[object.tipo].label}</span>
                        <Cite className="h-auto whitespace-normal py-1">{object.cita}</Cite>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {item.owner && <Section title="Responsable">{item.owner}</Section>}
              <Section title="Estado">{STATUS_LABELS[item.status] ?? item.status}</Section>
              {item.sourceUrl && (
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-body-sm">
                  Ver publicación original <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>

            <SheetFooter className="flex-row flex-wrap items-center gap-3 border-t border-border p-6">
              {error && <p role="alert" className="w-full text-body-sm text-risk">{error}</p>}
              <Button variant="ghost" asChild>
                <Link href={`/cliente/obligaciones/${item.id}`}>Abrir expediente</Link>
              </Button>
              <div className="ml-auto flex flex-wrap gap-3">
                {item.status === 'descartada' || item.status === 'archivada' ? (
                  <Button variant="outline" disabled={isPending} onClick={() => decide('identificada')}>Devolver a la bandeja</Button>
                ) : (
                  <>
                    {item.status !== 'archivada' && (
                      <Button variant="ghost" disabled={isPending} onClick={() => decide('archivada')}>Archivar</Button>
                    )}
                    {item.status !== 'cerrada' && (
                      <Button variant="outline" disabled={isPending} onClick={() => setDiscarding(true)}>Descartar</Button>
                    )}
                    {(item.status === 'identificada' || item.status === 'diferida') && (
                      <Button disabled={isPending} onClick={() => decide('aceptada')}>Atender</Button>
                    )}
                    {item.status === 'aceptada' && (
                      <Button disabled={isPending} onClick={() => decide('cerrada')}>Marcar como cerrado</Button>
                    )}
                  </>
                )}
              </div>
              {discarding && (
                <div className="flex w-full flex-col gap-3 border-t border-border pt-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-label text-ink-muted">Motivo para descartarlo</span>
                    <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Por ejemplo: no aplica a nuestras instalaciones" />
                  </label>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" disabled={isPending} onClick={() => { setDiscarding(false); setReason('') }}>Cancelar</Button>
                    <Button variant="destructive" disabled={isPending || !reason.trim()} onClick={() => decide('descartada', reason)}>Descartar asunto</Button>
                  </div>
                </div>
              )}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
