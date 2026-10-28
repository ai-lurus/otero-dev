'use client'

import { useState, useTransition } from 'react'
import {
  deleteRegulatoryItem,
  saveRegulatoryItem,
  setAdminItemStatus,
  setItemSent,
  type ItemInput,
  type RegulatoryItem,
} from '@/app/actions/regulatory-items'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  DIRECTIONS,
  DIRECTION_LABELS,
  IMPACTS,
  IMPACT_LABELS,
  INSTRUMENTS,
  MATERIAS,
  SCOPES,
  SCOPE_LABELS,
  STAGES,
  STATUSES,
  STATUS_LABELS,
  type Scope,
} from '@/lib/regulatory'

const NONE = 'ninguno'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function Pick({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? '' : next)}>
      <SelectTrigger aria-label={label} className="min-h-11 w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={NONE}>Sin definir</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

type Props = { tenantId: string; item: RegulatoryItem | null; onClose: () => void; onSaved: () => void; onDeleted?: () => void; inline?: boolean }

export function ItemFormDialog({ tenantId, item, onClose, onSaved, onDeleted, inline = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [scope, setScope] = useState<Scope>((item?.scope as Scope) ?? 'regulatorio')
  const [materia, setMateria] = useState(item?.materia ?? '')
  const [instrumentType, setInstrumentType] = useState(item?.instrumentType ?? '')
  const [stage, setStage] = useState(item?.stage ?? '')
  const [impact, setImpact] = useState(item?.impact ?? '')
  const [direction, setDirection] = useState(item?.impactDirection ?? '')
  const [generates, setGenerates] = useState(item?.generatesObligation ?? false)

  function run(task: () => Promise<void>, after: () => void = onSaved) {
    setError('')
    startTransition(async () => {
      try {
        await task()
        after()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo completar la acción.')
      }
    })
  }

  function submit(form: FormData) {
    const value = (name: string) => String(form.get(name) ?? '')
    if (!materia) {
      setError('Selecciona la materia del catálogo antes de guardar.')
      return
    }
    const input: ItemInput = {
      scope,
      materia,
      instrumentType,
      stage,
      impact,
      impactDirection: direction,
      generatesObligation: generates,
      title: value('title'),
      subtema: value('subtema'),
      description: value('description'),
      authority: value('authority'),
      source: value('source'),
      sourceUrl: value('sourceUrl'),
      stageDetail: value('stageDetail'),
      publishedAt: value('publishedAt'),
      dueDate: value('dueDate'),
      impactRationale: value('impactRationale'),
      obligationDetail: value('obligationDetail'),
      comments: value('comments'),
      owner: value('owner'),
    }
    run(() => saveRegulatoryItem(tenantId, item?.id ?? null, input))
  }

  const content = (
    <div className={inline ? 'w-full rounded-xl border border-border bg-card p-4  sm:p-6' : undefined}>
      {inline ? (
        <header className="mb-5 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{item ? 'Editar resumen del objeto regulativo' : 'Nuevo objeto regulativo'}</h2>
          <p className="text-sm text-muted-foreground">
            {item?.sentAt ? 'Este asunto ya es visible para el cliente.' : 'Es un borrador: el cliente no lo verá hasta que lo envíes.'}
          </p>
        </header>
      ) : (
        <DialogHeader>
          <DialogTitle>{item ? 'Editar resumen del objeto regulativo' : 'Nuevo objeto regulativo'}</DialogTitle>
          <DialogDescription>
            {item?.sentAt ? 'Este asunto ya es visible para el cliente.' : 'Es un borrador: el cliente no lo verá hasta que lo envíes.'}
          </DialogDescription>
        </DialogHeader>
      )}

      <form action={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de asunto">
              <Pick
                label="Tipo de asunto"
                value={scope}
                onChange={(next) => {
                  setScope(next as Scope)
                  setInstrumentType('')
                  setStage('')
                }}
                options={SCOPES.map((value) => ({ value, label: SCOPE_LABELS[value] }))}
              />
            </Field>
            <Field label="Materia (catálogo)">
              <Pick label="Materia" value={materia} onChange={setMateria} options={MATERIAS.map((value) => ({ value, label: value }))} />
            </Field>
          </div>

          <Field label="Título">
            <Input name="title" required defaultValue={item?.title} className="min-h-11 text-base" />
          </Field>
          <Field label="Descripción">
            <Textarea name="description" rows={3} defaultValue={item?.description} className="text-base" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subtema">
              <Input name="subtema" defaultValue={item?.subtema ?? ''} className="min-h-11 text-base" />
            </Field>
            <Field label="Tipo (decreto / acuerdo / aviso)">
              <Pick label="Tipo de documento" value={instrumentType} onChange={setInstrumentType} options={INSTRUMENTS[scope].map((value) => ({ value, label: value }))} />
            </Field>
            <Field label={scope === 'legislativo' ? 'Presenta' : 'Autoridad emisora'}>
              <Input name="authority" defaultValue={item?.authority ?? ''} className="min-h-11 text-base" />
            </Field>
            <Field label="Documento de referencia">
              <Input name="source" required defaultValue={item?.source} placeholder="DOF, Cámara de Diputados…" className="min-h-11 text-base" />
            </Field>
            <Field label="Etapa">
              <Pick label="Etapa" value={stage} onChange={setStage} options={STAGES[scope]} />
            </Field>
            <Field label={scope === 'legislativo' ? 'Detalle del estatus' : 'Detalle de la etapa'}>
              <Input name="stageDetail" defaultValue={item?.stageDetail ?? ''} className="min-h-11 text-base" />
            </Field>
            <Field label="Fecha de publicación">
              <Input name="publishedAt" type="date" defaultValue={item?.publishedAt ?? ''} className="min-h-11 text-base" />
            </Field>
            <Field label="Fechas relevantes">
              <Input name="dueDate" type="date" defaultValue={item?.dueDate ?? ''} className="min-h-11 text-base" />
            </Field>
            <Field label="Impacto">
              <Pick label="Impacto" value={impact} onChange={setImpact} options={IMPACTS.map((value) => ({ value, label: IMPACT_LABELS[value] }))} />
            </Field>
            <Field label="Sentido del impacto">
              <Pick label="Sentido del impacto" value={direction} onChange={setDirection} options={DIRECTIONS.map((value) => ({ value, label: DIRECTION_LABELS[value] }))} />
            </Field>
          </div>

          <Field label="Justificación del impacto">
            <Textarea name="impactRationale" rows={3} defaultValue={item?.impactRationale} className="text-base" />
          </Field>

          <div className="flex min-h-11 items-center gap-3">
            <Checkbox id="generates" checked={generates} onCheckedChange={(checked) => setGenerates(checked === true)} />
            <Label htmlFor="generates" className="text-sm">Genera obligaciones para el cliente</Label>
          </div>
          {generates && (
            <Field label="Obligaciones">
              <Textarea name="obligationDetail" rows={3} defaultValue={item?.obligationDetail} className="text-base" />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Responsable">
              <Input name="owner" defaultValue={item?.owner ?? ''} className="min-h-11 text-base" />
            </Field>
            <Field label="Enlace oficial">
              <Input name="sourceUrl" type="url" defaultValue={item?.sourceUrl ?? ''} placeholder="https://" className="min-h-11 text-base" />
            </Field>
          </div>
          <Field label="Comentarios">
            <Textarea name="comments" rows={2} defaultValue={item?.comments} className="text-base" />
          </Field>

          {item && (
            <Field label="Estado">
              <Select value={item.status} onValueChange={(status) => run(() => setAdminItemStatus(tenantId, item.id, status))} disabled={isPending}>
                <SelectTrigger aria-label="Estado" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>{STATUS_LABELS[value]}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {item && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  className="min-h-11 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (window.confirm('¿Eliminar este asunto y sus evidencias?')) run(() => deleteRegulatoryItem(tenantId, item.id), onDeleted ?? onSaved)
                  }}
                >
                  Eliminar
                </Button>
                <Button type="button" variant="outline" disabled={isPending} className="min-h-11" onClick={() => run(() => setItemSent(tenantId, item.id, !item.sentAt))}>
                  {item.sentAt ? 'Retirar del cliente' : 'Enviar al cliente'}
                </Button>
              </>
            )}
            {inline && (
              <Button type="button" variant="outline" disabled={isPending} className="min-h-11" onClick={onClose}>Cancelar</Button>
            )}
            <Button type="submit" disabled={isPending} className="min-h-11">{isPending ? 'Guardando…' : 'Guardar'}</Button>
          </div>
      </form>
    </div>
  )

  if (inline) {
    return <section aria-label="Editar objeto regulativo">{content}</section>
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">{content}</DialogContent>
    </Dialog>
  )
}
