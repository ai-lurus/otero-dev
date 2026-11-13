'use client'

import { useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { StatusTag } from '@/components/ui/status-tag'
import { AnalysisShowcase } from '@/components/onboarding/analysis-showcase'
import { useOnboardingUploads } from '@/components/onboarding/use-onboarding-uploads'
import { MAX_BATCH_FILES } from '@/lib/documents/batch'
import type { DocumentRow } from '@/lib/db/schema'
import type { Proposal } from '@/lib/onboarding-proposal'

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp,.heic'

type Props = {
  tenantId: string
  docs: DocumentRow[]
  proposal: Proposal
  onUpsert: (doc: DocumentRow) => void
}

// Primer paso del alta: los documentos hablan por la empresa. Si no hay, se llena a mano.
export function DocumentsStep({ tenantId, docs, proposal, onUpsert }: Props) {
  const { items, rejected, add, retry, busy } = useOnboardingUploads(tenantId, onUpsert)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const reading = docs.filter(d => d.analysisStatus === 'analyzing')
  const failed = items.filter(i => i.status === 'error')
  const hasDocs = docs.length > 0

  return (
    <div className="space-y-6">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files) }}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-ink bg-surface-sunken' : 'border-border-strong'}`}
      >
        <Upload aria-hidden className="mx-auto size-6 text-ink-muted" />
        <p className="mt-2 text-body-sm font-semibold text-ink">
          {hasDocs ? 'Suma más documentos' : 'Arrastra los permisos, licencias, registros y contratos de tu empresa'}
        </p>
        <p className="mt-1 text-caption text-ink-muted">
          PDF, Word, Excel, imágenes o texto, hasta 50 MB cada uno y {MAX_BATCH_FILES} archivos por tanda. No necesitas ordenarlos.
        </p>
        <Button variant="outline" className="mt-3" onClick={() => input.current?.click()}>Seleccionar archivos</Button>
        <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" aria-label="Documentos de tu empresa"
          onChange={e => { if (e.target.files) add(e.target.files); e.target.value = '' }} />
      </div>

      {rejected.length > 0 && (
        <ul role="alert" className="rounded-md bg-warn-tint px-3 py-2 text-caption text-warn-text">
          {rejected.map((r, i) => <li key={i}>{r.name}: {r.reason}</li>)}
        </ul>
      )}

      {items.some(i => i.status !== 'done') && (
        <ul className="flex flex-col gap-1" aria-live="polite">
          {items.filter(i => i.status !== 'done').map(item => (
            <li key={item.key} className="flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-3 py-2">
              <p className="min-w-0 truncate text-body-sm text-ink"><FileText aria-hidden className="mr-2 inline size-4 text-ink-muted" />{item.name}</p>
              {item.status === 'error' ? (
                <span className="flex shrink-0 items-center gap-2">
                  <StatusTag status="risk" label="Falló" />
                  <Button size="sm" variant="link" onClick={() => retry(item.key)}>Reintentar</Button>
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-caption text-ink-muted"><Spinner /> {item.status === 'queued' ? 'En cola' : item.status === 'uploading' ? 'Subiendo' : 'Registrando'}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {failed.length > 0 && <p role="alert" className="text-body-sm text-risk">{failed[0].error}</p>}

      {reading.length > 0 && (
        <div className="rounded-lg border border-border bg-brand-tint px-4 py-3" aria-live="polite">
          <p className="flex items-center gap-2 text-body-sm font-medium text-brand-text">
            <Spinner /> Otero está leyendo {reading.length} {reading.length === 1 ? 'documento completo' : 'documentos completos'}
          </p>
          <p className="mt-1 text-caption text-ink-muted">Toma de uno a dos minutos. Puedes quedarte aquí: los resultados aparecen solos.</p>
        </div>
      )}

      {proposal.readCount > 0 && <AnalysisShowcase proposal={proposal} />}

      {proposal.unreadCount > 0 && !busy && (
        <p className="text-caption text-ink-muted">
          {proposal.unreadCount} {proposal.unreadCount === 1 ? 'documento no se pudo leer' : 'documentos no se pudieron leer'}. No se pierden: quedan en Documentos para capturarlos a mano.
        </p>
      )}

      {!hasDocs && !busy && (
        <p className="text-body-sm text-ink-muted">¿No tienes los documentos a la mano? Continúa y llena tu empresa a mano; puedes subirlos después desde Documentos.</p>
      )}
    </div>
  )
}
