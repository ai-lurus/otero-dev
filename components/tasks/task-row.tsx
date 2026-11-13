'use client'

import { CalendarClock, Pencil, Trash2, User } from 'lucide-react'
import type { TaskRow as Task } from '@/app/actions/tasks'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusTag } from '@/components/ui/status-tag'
import { TASK_STATUSES, TASK_STATUS_LABELS, taskLight } from '@/lib/tasks'
import { dueShort } from '@/lib/inbox'
import { cn } from '@/lib/utils'

type Props = {
  task: Task
  /** Texto bajo el título (p. ej. el asunto en "Mis tareas"). */
  context?: React.ReactNode
  isDirector: boolean
  busy: boolean
  onStatus: (status: string) => void
  onEdit?: () => void
  onDelete?: () => void
}

/** Fila de una tarea: título, responsable, plazo con semáforo y estatus. */
export function TaskRowView({ task, context, isDirector, busy, onStatus, onEdit, onDelete }: Props) {
  const { light, label } = taskLight(task)
  const done = task.status === 'completada'
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className={cn('text-body-sm font-medium text-ink', done && 'text-ink-muted line-through')}>{task.title}</span>
          {context}
        </div>
        {light !== 'none' && label && <StatusTag status={light} label={label} />}
        {done && <StatusTag status="ok" label="Completada" />}
      </div>
      {task.description && <p className="line-clamp-3 whitespace-pre-line text-caption text-ink-muted">{task.description}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-caption text-ink-muted">
        <span className="inline-flex items-center gap-1"><User aria-hidden className="size-3.5" />{task.assigneeName ?? 'Sin responsable'}</span>
        {(task.startDate || task.dueDate) && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock aria-hidden className="size-3.5" />
            {task.startDate && <>Inicia <span className="text-data">{task.startDate}</span></>}
            {task.startDate && task.dueDate && ' · '}
            {task.dueDate && <>{dueShort(task.dueDate)} · <span className="text-data">{task.dueDate}</span></>}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Select value={task.status} onValueChange={onStatus} disabled={busy}>
            <SelectTrigger aria-label="Estatus de la tarea" size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TASK_STATUSES.map((status) => <SelectItem key={status} value={status}>{TASK_STATUS_LABELS[status]}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
          {isDirector && onEdit && <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy} aria-label="Editar tarea"><Pencil aria-hidden /></Button>}
          {isDirector && onDelete && <Button variant="ghost" size="sm" onClick={onDelete} disabled={busy} aria-label="Eliminar tarea"><Trash2 aria-hidden /></Button>}
        </div>
      </div>
    </li>
  )
}
