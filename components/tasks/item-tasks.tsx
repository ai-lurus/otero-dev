'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { deleteTask, getItemTasks, setTaskStatus, type TaskRow } from '@/app/actions/tasks'
import type { TeamMember } from '@/lib/regulatory-items-db'
import { Button } from '@/components/ui/button'
import { TaskFormDialog } from './task-form-dialog'
import { TaskRowView } from './task-row'

/** Sección "Tareas" de un asunto: lista, alta, estatus y, para el director, edición. */
export function ItemTasks({ itemId, canCreate }: { itemId: string; canCreate: boolean }) {
  const [tasks, setTasks] = useState<TaskRow[] | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [isDirector, setIsDirector] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<{ task?: TaskRow } | null>(null)
  const [pending, start] = useTransition()

  const load = useCallback(() => {
    getItemTasks(itemId)
      .then((data) => { setTasks(data.tasks); setTeam(data.team); setIsDirector(data.isDirector) })
      .catch(() => setError('No se pudieron cargar las tareas'))
  }, [itemId])
  useEffect(() => { setTasks(null); load() }, [load])

  const run = (action: () => Promise<void>) =>
    start(async () => {
      setError(null)
      try { await action(); load() } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción') }
    })

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-label text-ink-muted">Tareas</h3>
        {canCreate && (
          <Button variant="ghost" size="sm" onClick={() => setForm({})}><Plus aria-hidden />Agregar tarea</Button>
        )}
      </div>
      {error && <p role="alert" className="text-body-sm text-risk">{error}</p>}
      {tasks === null ? (
        <p className="text-caption text-ink-muted">Cargando tareas…</p>
      ) : tasks.length === 0 ? (
        <p className="text-caption text-ink-muted">Este asunto aún no tiene tareas.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <TaskRowView
              key={task.id}
              task={task}
              isDirector={isDirector}
              busy={pending}
              onStatus={(status) => run(() => setTaskStatus(task.id, status))}
              onEdit={() => setForm({ task })}
              onDelete={() => run(() => deleteTask(task.id))}
            />
          ))}
        </ul>
      )}
      {form && (
        <TaskFormDialog
          itemId={itemId}
          task={form.task}
          team={team}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load() }}
        />
      )}
    </section>
  )
}
