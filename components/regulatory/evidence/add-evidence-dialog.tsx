'use client'

import { useRef, useState, useTransition } from 'react'
import { addItemEvidence } from '@/app/actions/regulatory-items'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// Alta de notas, documentos y evidencias de un asunto. La usan el expediente
// (/cliente/obligaciones/[id]) y el panel del tablero de cumplimiento.

export type Kind = 'nota' | 'documento' | 'evidencia'
export const KINDS: readonly Kind[] = ['nota', 'documento', 'evidencia']

const ACCEPT: Record<Kind, string> = {
  nota: '',
  documento: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
  evidencia: 'image/*,.pdf,.xls,.xlsx,.csv',
}
export const KIND_COPY: Record<Kind, { tab: string; add: string; empty: string }> = {
  nota: { tab: 'Notas', add: 'Nueva nota', empty: 'Aún no hay notas.' },
  documento: { tab: 'Documentos', add: 'Subir documento', empty: 'Aún no hay documentos.' },
  evidencia: { tab: 'Evidencias', add: 'Subir evidencia', empty: 'Aún no hay evidencias.' },
}

export function AddEvidenceDialog({ kind, itemId, onClose, onSaved }: { kind: Kind; itemId: string; onClose: () => void; onSaved: () => void }) {
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
