'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, CircleDot, Download, ExternalLink, FileSpreadsheet, FileText, ImageIcon, Pencil, Plus, Search } from 'lucide-react'
import { addItemEvidence, updateItemStatus, type RegulatoryItem as Obligation } from '@/app/actions/regulatory-items'
import { ItemFormDialog } from '@/app/admin/obligaciones/item-form'
import { ImpactBadge, SourceLink } from '@/components/regulatory/items-list'
import { DIRECTION_LABELS, SCOPE_LABELS, STAGE_LABELS, STATUS_LABELS } from '@/lib/regulatory'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

type Kind = 'nota' | 'documento' | 'evidencia'
type Evidence = Obligation['evidence'][number]
type TimelineEvent = {
  id: string
  eventType: string
  title: string
  description: string
  createdAt: Date | string
}

const PAGE_SIZE = 10
const ACCEPT: Record<Kind, string> = {
  nota: '',
  documento: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
  evidencia: 'image/*,.pdf,.xls,.xlsx,.csv',
}
const KIND_COPY: Record<Kind, { tab: string; add: string; empty: string }> = {
  nota: { tab: 'Notas', add: 'Nueva nota', empty: 'Aún no hay notas.' },
  documento: { tab: 'Documentos', add: 'Subir documento', empty: 'Aún no hay documentos.' },
  evidencia: { tab: 'Evidencias', add: 'Subir evidencia', empty: 'Aún no hay evidencias.' },
}

const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(value))
const fileUrl = (pathname: string, download = false) =>
  `/api/obligations/file?pathname=${encodeURIComponent(pathname)}${download ? '&download=1' : ''}`
const isImage = (pathname: string) => /\.(jpe?g|png|webp|heic)$/i.test(pathname)
const displayName = (item: Evidence) => item.title

function FileIcon({ pathname }: { pathname: string }) {
  if (isImage(pathname)) return <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
  if (/\.(xlsx?|csv)$/i.test(pathname)) return <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
  return <FileText className="size-4 shrink-0 text-muted-foreground" />
}

export function ObligationDetail({
  obligation,
  adminMode = false,
  tenantId,
}: {
  obligation: Obligation & { events?: TimelineEvent[] }
  adminMode?: boolean
  tenantId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'resumen' | Kind>('resumen')
  const [dialogKind, setDialogKind] = useState<Kind | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const byKind = useMemo(() => {
    const groups: Record<Kind, Evidence[]> = { nota: [], documento: [], evidencia: [] }
    for (const item of obligation.evidence) if (item.kind in groups) groups[item.kind as Kind].push(item)
    return groups
  }, [obligation.evidence])

  const code = `${obligation.scope === 'legislativo' ? 'LEG' : 'REG'}-${obligation.id.slice(0, 8).toUpperCase()}`

  function changeStatus(status: string) {
    startTransition(async () => {
      await updateItemStatus(obligation.id, status)
      router.refresh()
    })
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground md:px-10 md:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Link
          href="/cliente/obligaciones"
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Matriz regulatoria
        </Link>

        {adminMode && tenantId && isEditOpen ? (
          <ItemFormDialog
            inline
            tenantId={tenantId}
            item={obligation}
            onClose={() => setIsEditOpen(false)}
            onSaved={() => {
              setIsEditOpen(false)
              router.refresh()
            }}
            onDeleted={() => router.push('/admin/obligaciones')}
          />
        ) : (
        <>
        <header className="flex flex-col gap-3 border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-primary">{code}</span>
            <Badge variant="outline">{SCOPE_LABELS[obligation.scope as keyof typeof SCOPE_LABELS] ?? obligation.scope}</Badge>
            <ImpactBadge impact={obligation.impact} />
            <Badge variant="secondary">{STATUS_LABELS[obligation.status] ?? obligation.status}</Badge>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="item-title item-title-lg min-w-0" title={obligation.title}>{obligation.title}</h1>
            {adminMode && tenantId && (
              <Button type="button" variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto" onClick={() => setIsEditOpen(true)}>
                <Pencil data-icon="inline-start" />
                Editar objeto
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {obligation.materia}
            {obligation.instrumentType ? ` · ${obligation.instrumentType}` : ''} · Origen: {obligation.source}
          </p>
        </header>

        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <TabsList className="h-11 w-max">
              <TabsTrigger value="resumen" className="min-h-9 px-4">Resumen</TabsTrigger>
              {(Object.keys(KIND_COPY) as Kind[]).map((kind) => (
                <TabsTrigger key={kind} value={kind} className="min-h-9 gap-2 px-4">
                  {KIND_COPY[kind].tab}
                  <span className="text-xs text-muted-foreground">{byKind[kind].length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="resumen" className="mt-5">
            <div className="flex flex-col gap-8">
            <dl className="grid gap-5 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
              <Field label="Materia (catálogo)">{obligation.materia || 'Sin definir'}</Field>
              <Field label="Tipo">{obligation.instrumentType || 'Sin definir'}</Field>
              <Field label="Descripción" wide>{obligation.description || 'Sin descripción agregada.'}</Field>
              {obligation.subtema && <Field label="Subtema" wide>{obligation.subtema}</Field>}
              <Field label="Documento de referencia">{obligation.source || 'Sin definir'}</Field>
              <Field label="Fecha de publicación">{obligation.publishedAt || 'Sin fecha'}</Field>
              <Field label="Impacto">{obligation.impact ? `Impacto ${obligation.impact}` : 'Sin definir'}</Field>
              <Field label="Sentido del impacto">{obligation.impactDirection ? DIRECTION_LABELS[obligation.impactDirection] : 'Sin definir'}</Field>
              <Field label="Justificación del impacto" wide>{obligation.impactRationale || 'Sin justificación agregada.'}</Field>
              <Field label="Obligaciones" wide>
                {obligation.generatesObligation ? obligation.obligationDetail || 'Sí, sin detalle agregado.' : 'No genera obligaciones registradas.'}
              </Field>
              <Field label="Fechas relevantes" wide>
                {obligation.dueDate ? `Fecha: ${obligation.dueDate}` : 'Sin fecha relevante registrada.'}
              </Field>
              <Field label="Descripción de la fecha relevante" wide>
                {obligation.stageDetail || 'Sin descripción agregada.'}
              </Field>
              <Field label="Etapa / estatus">
                {obligation.stage ? STAGE_LABELS[obligation.stage] ?? obligation.stage : 'Sin definir'}
              </Field>
              <Field label="Autoridad / presenta">{obligation.authority || 'Sin definir'}</Field>
              <Field label="Responsable">{obligation.owner || 'Sin asignar'}</Field>
              {obligation.comments && <Field label="Comentarios" wide>{obligation.comments}</Field>}
              {obligation.sourceUrl && <div className="sm:col-span-2"><SourceLink url={obligation.sourceUrl} /></div>}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</dt>
                <dd>
                  <Select value={obligation.status} onValueChange={changeStatus} disabled={isPending}>
                    <SelectTrigger className="min-h-11 w-full sm:w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </dd>
              </div>
            </dl>
            <HistoryTimeline events={obligation.events ?? []} createdAt={obligation.createdAt} createdBy={obligation.createdBy} />
            </div>
          </TabsContent>

          {(Object.keys(KIND_COPY) as Kind[]).map((kind) => (
            <TabsContent key={kind} value={kind} className="mt-5">
              <EvidencePanel kind={kind} items={byKind[kind]} onAdd={() => setDialogKind(kind)} />
            </TabsContent>
          ))}
        </Tabs>
        </>
        )}
      </div>

      {dialogKind && (
        <AddDialog
          kind={dialogKind}
          itemId={obligation.id}
          onClose={() => setDialogKind(null)}
          onSaved={() => {
            setDialogKind(null)
            router.refresh()
          }}
        />
      )}
    </main>
  )
}

function HistoryTimeline({ events, createdAt, createdBy }: { events: TimelineEvent[]; createdAt: Date | string; createdBy: string }) {
  const history = events.length
    ? events
    : [{ id: 'created', eventType: 'created', title: 'Asunto identificado', description: 'Se abrió el expediente regulatorio.', createdAt }]

  return (
    <section aria-labelledby="history-title" className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 id="history-title" className="text-lg font-semibold">Historia del asunto</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cambios, notas y documentos registrados en el expediente.</p>
        </div>
        <CircleDot className="size-5 text-primary" aria-hidden="true" />
      </div>
      <ol className="relative flex flex-col gap-5 border-l border-border pl-5">
        {history.map((event, index) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-[1.65rem] top-0.5 grid size-5 place-items-center rounded-full border border-border bg-card text-primary">
              {index === 0 ? <CheckCircle2 className="size-3" aria-hidden="true" /> : <CircleDot className="size-3" aria-hidden="true" />}
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <h3 className="font-medium">{event.title}</h3>
                <time className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</time>
              </div>
              {event.description && <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>}
              <p className="text-xs text-muted-foreground">Registrado por {event.eventType === 'created' ? createdBy : 'el equipo'}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 leading-relaxed">{children}</dd>
    </div>
  )
}

function EvidencePanel({ kind, items, onAdd }: { kind: Kind; items: Evidence[]; onAdd: () => void }) {
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return term ? items.filter((item) => `${item.title} ${item.content}`.toLowerCase().includes(term)) : items
  }, [items, query])
  const shown = filtered.slice(0, visible)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setVisible(PAGE_SIZE) }}
            placeholder={`Buscar en ${KIND_COPY[kind].tab.toLowerCase()}`}
            aria-label={`Buscar en ${KIND_COPY[kind].tab.toLowerCase()}`}
            className="min-h-11 pl-9 text-base"
          />
        </div>
        <Button onClick={onAdd} className="min-h-11">
          <Plus data-icon="inline-start" />
          {KIND_COPY[kind].add}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Empty className="rounded-xl border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>{items.length === 0 ? KIND_COPY[kind].empty : 'Sin resultados'}</EmptyTitle>
            <EmptyDescription>
              {items.length === 0 ? 'Usa el botón para agregar el primero.' : 'Prueba con otra búsqueda.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : kind === 'nota' ? (
        <ul className="flex flex-col gap-3">
          {shown.map((note) => (
            <li key={note.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium">{note.title}</h3>
                <time className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</time>
              </div>
              {note.content && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{note.content}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead className="hidden sm:table-cell">Agregado</TableHead>
                <TableHead className="w-24 text-right">Abrir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-0">
                    <div className="flex items-center gap-3">
                      {item.blobPathname && isImage(item.blobPathname) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fileUrl(item.blobPathname)} alt={displayName(item)} loading="lazy" className="size-10 shrink-0 rounded-md border border-border object-cover" />
                      ) : (
                        <FileIcon pathname={item.blobPathname ?? ''} />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{displayName(item)}</p>
                        <p className="truncate text-xs text-muted-foreground sm:hidden">{formatDate(item.createdAt)}</p>
                        {item.content && <p className="line-clamp-1 text-xs text-muted-foreground">{item.content}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground sm:table-cell">{formatDate(item.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {item.blobPathname && (
                      <div className="flex justify-end">
                        <Button asChild variant="ghost" size="icon" className="size-11">
                          <a href={fileUrl(item.blobPathname)} target="_blank" rel="noreferrer" aria-label={`Ver ${displayName(item)}`}><ExternalLink /></a>
                        </Button>
                        <Button asChild variant="ghost" size="icon" className="hidden size-11 sm:inline-flex">
                          <a href={fileUrl(item.blobPathname, true)} aria-label={`Descargar ${displayName(item)}`}><Download /></a>
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filtered.length > visible && (
        <Button variant="outline" className="min-h-11 self-center" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
          Mostrar más ({filtered.length - visible})
        </Button>
      )}
    </div>
  )
}

function AddDialog({ kind, itemId, onClose, onSaved }: { kind: Kind; itemId: string; onClose: () => void; onSaved: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const isNote = kind === 'nota'

  function submit(form: FormData) {
    setError('')
    startTransition(async () => {
      try {
        const file = form.get('file')
        let blobPathname: string | undefined
        if (!isNote) {
          if (!(file instanceof File) || !file.size) throw new Error('Selecciona un archivo.')
          const body = new FormData()
          body.append('file', file)
          body.append('itemId', itemId)
          const response = await fetch('/api/obligations/upload', { method: 'POST', body })
          if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? 'No se pudo subir el archivo.')
          blobPathname = (await response.json()).pathname
        }
        const title = String(form.get('title') || '').trim() || (file instanceof File ? file.name : '')
        await addItemEvidence({ itemId, kind, title, content: String(form.get('content') || ''), blobPathname })
        onSaved()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      }
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{KIND_COPY[kind].add}</DialogTitle>
          <DialogDescription>
            {isNote ? 'Escribe una nota para el expediente.' : 'Los archivos se guardan de forma privada. Máximo 25 MB.'}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={submit} className="flex flex-col gap-3">
          {!isNote && (
            <Input name="file" type="file" required accept={ACCEPT[kind]} aria-label="Archivo" className="min-h-11 text-base" />
          )}
          <Input name="title" required={isNote} placeholder={isNote ? 'Título de la nota' : 'Nombre (opcional)'} className="min-h-11 text-base" />
          <Textarea name="content" required={isNote} rows={isNote ? 5 : 2} placeholder={isNote ? 'Contenido' : 'Descripción (opcional)'} className="text-base" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isPending} className="min-h-11">
            {isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
