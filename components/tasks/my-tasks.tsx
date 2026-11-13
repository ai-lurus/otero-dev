'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteTask, setTaskStatus, type MyTask } from '@/app/actions/tasks'
import type { TeamMember } from '@/lib/regulatory-items-db'
import { Button } from '@/components/ui/button'
import { TASK_STATUS_LABELS, taskLight } from '@/lib/tasks'
import { cn } from '@/lib/utils'
import { TaskFormDialog } from './task-form-dialog'
import { TaskRowView } from './task-row'

const FILTERS = [
  { id: 'abiertas', label: 'Abiertas' },
  { id: 'vencen', label: 'Por vencer' },
  { id: 'completadas', label: 'Completadas' },
  { id: 'todas', label: 'Todas' },
] as const
type Filter = (typeof FILTERS)[number]['id']

const matches = (task: MyTask, filter: Filter) => {
  const { light } = taskLight(task)
  if (filter === 'abiertas') return task.status !== 'completada'
  if (filter === 'vencen') return light === 'risk' || light === 'warn'
  if (filter === 'completadas') return task.status === 'completada'
  return true
}

/** "Mis tareas": cada persona ve las suyas; el director, todas las de la empresa. */
export function MyTasks({ tasks, team, isDirector }: { tasks: MyTask[]; team: TeamMember[]; isDirector: boolean }) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('abiertas')
  const [editing, setEditing] = useState<MyTask | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const shown = tasks.filter((task) => matches(task, filter))

  const run = (action: () => Promise<void>) =>
    start(async () => {
      setError(null)
      try { await action(); router.refresh() } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción') }
    })

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-display-md text-ink">Mis tareas</h1>
        <p className="text-body-sm text-ink-muted">
          {isDirector ? 'Todas las tareas de tu empresa, de cada asunto.' : 'Las tareas que te asignaron, de cada asunto.'}
        </p>
      </header>

      <div role="tablist" aria-label="Filtro de tareas" className="flex flex-wrap gap-2">
        {FILTERS.map((option) => {
          const count = tasks.filter((task) => matches(task, option.id)).length
          return (
            <Button key={option.id} role="tab" aria-selected={filter === option.id} variant={filter === option.id ? 'default' : 'outline'} size="sm" onClick={() => setFilter(option.id)}>
              {option.label} <span className={cn('text-data', filter !== option.id && 'text-ink-muted')}>{count}</span>
            </Button>
          )
        })}
      </div>

      {error && <p role="alert" className="text-body-sm text-risk">{error}</p>}

      {shown.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-sunken p-6 text-body-sm text-ink-muted">
          {tasks.length === 0 ? 'Aún no tienes tareas. Se agregan desde un asunto en Mi cumplimiento.' : `No hay tareas en ${FILTERS.find((o) => o.id === filter)?.label.toLowerCase()}.`}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((task) => (
            <TaskRowView
              key={task.id}
              task={task}
              isDirector={isDirector}
              busy={pending}
              context={<Link href="/cliente/cumplimiento" className="truncate text-caption text-ink-muted no-underline hover:underline">{task.itemTitle}</Link>}
              onStatus={(status) => run(() => setTaskStatus(task.id, status))}
              onEdit={() => setEditing(task)}
              onDelete={() => run(() => deleteTask(task.id))}
            />
          ))}
        </ul>
      )}

      {editing && (
        <TaskFormDialog itemId={editing.itemId} task={editing} team={team} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh() }} />
      )}
    </div>
  )
}
