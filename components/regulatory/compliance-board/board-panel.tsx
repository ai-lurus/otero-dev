'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, ExternalLink, FileText, ImageIcon, NotebookPen, Plus } from 'lucide-react'
import type { BoardItem, BoardViewer } from '@/app/actions/compliance-board'
import type { TeamMember } from '@/lib/regulatory-items-db'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Cite, DeadlineChip } from '@/components/ui/status-tag'
import { BandTag, sourceCite } from '@/components/regulatory/inbox/band-tag'
import { AddEvidenceDialog, KINDS, KIND_COPY, type Kind } from '@/components/regulatory/evidence/add-evidence-dialog'
import { STAGES, canMoveTo, stageLabel, stageOf, type Stage } from '@/lib/compliance-board'
import { bandOf, daysUntil, deadlineLabel, dueShort } from '@/lib/inbox'
import { IMPACT_LABELS, itemFolio } from '@/lib/regulatory'
import { cn } from '@/lib/utils'

type Props = {
  item: BoardItem | null
  viewer: BoardViewer
  /** En modo Director se puede reasignar; en modo Equipo el responsable es de solo lectura. */
  directorMode: boolean
  team: TeamMember[]
  busy: boolean
  onClose: () => void
  onMove: (to: Stage) => void
  onReassign: (memberId: string) => void
  onEvidenceSaved: () => void
}

const KIND_ICON: Record<Kind, typeof FileText> = { nota: NotebookPen, documento: FileText, evidencia: ImageIcon }

const longDate = (value: string) =>
  new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 py-2">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body-sm text-ink">{children}</dd>
    </div>
  )
}

/** Panel lateral del tablero: datos del asunto, responsable, etapa y su expediente. */
export function BoardPanel({ item, viewer, directorMode, team, busy, onClose, onMove, onReassign, onEvidenceSaved }: Props) {
  const [adding, setAdding] = useState<Kind | null>(null)

  const stage = item ? stageOf(item) : null
  const deadline = item ? deadlineLabel(item.dueDate) : null
  const days = item ? daysUntil(item.dueDate) : null
  const band = item ? bandOf(item) : null
  const showDeadline = deadline && stage !== 'cumplido' && days !== null && days <= 30
  const ownerInTeam = item?.assigneeId && team.some((member) => member.id === item.assigneeId)

  return (
    <Sheet open={!!item} onOpenChange={(open) => { if (!open) { setAdding(null); onClose() } }}>
      <SheetContent className="w-full gap-0 bg-surface-raised p-0 sm:max-w-xl">
        {item && stage && band && (
          <>
            <SheetHeader className="gap-3 border-b border-border p-6 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <Cite>{sourceCite(item)}</Cite>
                <BandTag band={band} />
                {showDeadline && <DeadlineChip>{deadline}</DeadlineChip>}
              </div>
              <SheetTitle asChild className="text-heading text-ink"><p>{item.title}</p></SheetTitle>
              <SheetDescription className="text-body-sm text-ink-muted">
                {[item.authority, item.materia].filter(Boolean).join(' · ')}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
              <dl className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface px-4">
                <Field label="Folio"><span className="text-data">{itemFolio(item)}</span></Field>
                {item.publishedAt && <Field label="Publicación">{longDate(item.publishedAt)} · {item.source}</Field>}
                <Field label="Relevancia">
                  <span className="line-clamp-4">{[item.impact && IMPACT_LABELS[item.impact], item.impactRationale].filter(Boolean).join('. ') || 'Sin valorar'}</span>
                </Field>
                <Field label="Plazo">
                  {item.dueDate ? (
                    <span className={cn(stage !== 'cumplido' && days !== null && days < 0 && 'text-risk')}>
                      {dueShort(item.dueDate)} · <span className="text-data">{item.dueDate}</span>
                    </span>
                  ) : 'Sin plazo'}
                </Field>
                {item.obligationDetail && <Field label="Qué te obliga"><span className="line-clamp-4 whitespace-pre-line">{item.obligationDetail}</span></Field>}
              </dl>

              <section className="flex flex-col gap-2">
                <h3 className="text-label text-ink-muted">Responsable</h3>
                {directorMode && team.length > 0 ? (
                  <Select value={ownerInTeam ? item.assigneeId! : undefined} onValueChange={onReassign} disabled={busy}>
                    <SelectTrigger aria-label="Responsable" className="w-full">
                      <SelectValue placeholder={item.owner ?? 'Elige a una persona'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {team.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.position ? `${member.name} · ${member.position}` : member.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <p className="rounded-md border border-border bg-surface-sunken px-3 py-2 text-body-sm text-ink">{item.owner ?? 'Sin responsable'}</p>
                    <p className="text-caption text-ink-muted">
                      {viewer.isDirector ? 'Cambia a la vista de director para reasignarlo.' : 'Solo el director puede reasignar el asunto.'}
                    </p>
                  </>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-label text-ink-muted">Estado</h3>
                <div role="radiogroup" aria-label="Estado" className="flex flex-col gap-2">
                  {STAGES.map((option) => {
                    const active = option === stage
                    const locked = !canMoveTo(option, viewer.isDirector) || (stage === 'cumplido' && !viewer.isDirector)
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={busy || (locked && !active)}
                        onClick={() => !active && onMove(option)}
                        className={cn(
                          'flex items-center justify-between rounded-md border px-4 py-2 text-left text-body-sm transition-colors',
                          active ? 'border-ink bg-ink text-surface' : 'border-border-strong bg-surface-raised text-ink hover:bg-surface-sunken',
                          'disabled:border-border disabled:bg-surface-sunken disabled:text-ink-muted',
                        )}
                      >
                        {stageLabel(option)}
                        {active && <Check aria-hidden className="size-4" />}
                      </button>
                    )
                  })}
                </div>
                {!viewer.isDirector && <p className="text-caption text-ink-muted">Al terminar, pásalo a En revisión: el director lo marca como cumplido.</p>}
              </section>

              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-label text-ink-muted">Expediente</h3>
                  <Link href={`/cliente/obligaciones/${item.id}?from=cumplimiento`} className="inline-flex items-center gap-1 text-body-sm">
                    Abrir expediente <ExternalLink aria-hidden className="size-3.5" />
                  </Link>
                </div>
                <ul className="flex flex-col gap-3">
                  {KINDS.map((kind) => {
                    const entries = item.evidence.filter((entry) => entry.kind === kind)
                    const Icon = KIND_ICON[kind]
                    return (
                      <li key={kind} className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-4 shadow-xs">
                        <div className="flex items-center gap-2">
                          <Icon aria-hidden className="size-4 text-ink-muted" />
                          <Link href={`/cliente/obligaciones/${item.id}?from=cumplimiento&tab=${kind}`} className="text-body-sm font-medium text-ink no-underline hover:underline">
                            {KIND_COPY[kind].tab}
                          </Link>
                          <span className="text-caption text-ink-muted">{entries.length}</span>
                          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAdding(kind)}>
                            <Plus aria-hidden />
                            {KIND_COPY[kind].add}
                          </Button>
                        </div>
                        {entries.length === 0 ? (
                          <p className="text-caption text-ink-muted">{KIND_COPY[kind].empty}</p>
                        ) : (
                          <ul className="flex flex-col gap-1">
                            {entries.slice(0, 2).map((entry) => (
                              <li key={entry.id} className="truncate text-body-sm text-ink">{entry.title}</li>
                            ))}
                            {entries.length > 2 && <li className="text-caption text-ink-muted">y {entries.length - 2} más en el expediente</li>}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            </div>

            {adding && (
              <AddEvidenceDialog
                kind={adding}
                itemId={item.id}
                onClose={() => setAdding(null)}
                onSaved={() => { setAdding(null); onEvidenceSaved() }}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
