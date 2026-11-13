'use client'

import { useState, useTransition } from 'react'
import { createTask, updateTask, type TaskRow } from '@/app/actions/tasks'
import type { TeamMember } from '@/lib/regulatory-items-db'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  /** Asunto al que pertenece la tarea nueva; al editar sale de la tarea. */
  itemId: string
  task?: TaskRow
  /** Solo el director recibe el equipo y puede elegir responsable. */
  team: TeamMember[]
  onClose: () => void
  onSaved: () => void
}

/** Alta y edición de una tarea: título, descripción, responsable y fechas. */
export function TaskFormDialog({ itemId, task, team, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [assigneeId, setAssigneeId] = useState<string | null>(task?.assigneeId ?? null)
  const [startDate, setStartDate] = useState(task?.startDate ?? '')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const save = () => {
    setError(null)
    start(async () => {
      try {
        const input = { title, description, assigneeId, startDate: startDate || null, dueDate: dueDate || null }
        if (task) await updateTask(task.id, input)
        else await createTask(itemId, input)
        onSaved()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo guardar la tarea')
      }
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-surface-raised">
        <DialogHeader>
          <DialogTitle className="text-heading text-ink">{task ? 'Editar tarea' : 'Agregar tarea'}</DialogTitle>
          <DialogDescription className="text-body-sm text-ink-muted">Una acción concreta del asunto, con responsable y plazo.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-title" className="text-label text-ink-muted">Título</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="task-description" className="text-label text-ink-muted">Descripción</Label>
            <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          {team.length > 0 && (
            <div className="flex flex-col gap-1">
              <Label className="text-label text-ink-muted">Responsable</Label>
              <Select value={assigneeId ?? undefined} onValueChange={setAssigneeId}>
                <SelectTrigger aria-label="Responsable" className="w-full"><SelectValue placeholder="Elige a una persona" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {team.map((member) => (
                      <SelectItem key={member.id} value={member.id}>{member.position ? `${member.name} · ${member.position}` : member.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="task-start" className="text-label text-ink-muted">Fecha de inicio</Label>
              <Input id="task-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="task-due" className="text-label text-ink-muted">Fecha límite</Label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {error && <p role="alert" className="text-body-sm text-risk">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Cancelar</Button>
          <Button onClick={save} disabled={pending || !title.trim()}>{task ? 'Guardar cambios' : 'Agregar tarea'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
