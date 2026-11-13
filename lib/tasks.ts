import { daysUntil } from './inbox'

// Tareas de un asunto: estatus, semáforo de plazo y validación.
// Lógica pura, sin acceso a datos, para poder probarla.

export const TASK_STATUSES = ['pendiente', 'en_curso', 'completada'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En curso',
  completada: 'Completada',
}

export const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value)

export type Light = 'risk' | 'warn' | 'ok' | 'none'

/** Días de anticipación para pasar a rojo y a amarillo. */
export const RISK_DAYS = 2
export const WARN_DAYS = 7

/** Semáforo del plazo: rojo vencida o a 2 días, amarillo a 7 días, verde con holgura. Completada no se semaforiza. */
export function taskLight(task: { status: string; dueDate: string | null }, today = new Date()): { light: Light; label: string | null } {
  if (task.status === 'completada') return { light: 'none', label: null }
  const days = daysUntil(task.dueDate, today)
  if (days === null) return { light: 'none', label: null }
  if (days < 0) return { light: 'risk', label: days === -1 ? 'Venció ayer' : `Venció hace ${-days} días` }
  if (days === 0) return { light: 'risk', label: 'Vence hoy' }
  const label = days === 1 ? 'Vence mañana' : `Vence en ${days} días`
  if (days <= RISK_DAYS) return { light: 'risk', label }
  if (days <= WARN_DAYS) return { light: 'warn', label }
  return { light: 'ok', label }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const validDate = (value: string) => DATE_RE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime())

export type TaskInput = { title: string; description?: string; assigneeId?: string | null; startDate?: string | null; dueDate?: string | null }

/** Limpia y valida los datos de una tarea; lanza con un mensaje legible si algo no cuadra. */
export function parseTaskInput(input: TaskInput) {
  const title = (input.title ?? '').trim()
  if (!title) throw new Error('Escribe el título de la tarea')
  if (title.length > 200) throw new Error('El título es demasiado largo')
  const description = (input.description ?? '').trim()
  if (description.length > 4000) throw new Error('La descripción es demasiado larga')
  const startDate = input.startDate || null
  const dueDate = input.dueDate || null
  if ((startDate && !validDate(startDate)) || (dueDate && !validDate(dueDate))) throw new Error('Fecha inválida')
  if (startDate && dueDate && dueDate < startDate) throw new Error('La fecha límite no puede ser anterior al inicio')
  return { title, description, assigneeId: input.assigneeId || null, startDate, dueDate }
}

/** Quién puede ver y qué: el director todo; el miembro solo lo asignado a él. */
export const canSeeTask = (viewer: { isDirector: boolean; memberId: string | null }, task: { assigneeId: string | null }) =>
  viewer.isDirector || (viewer.memberId !== null && task.assigneeId === viewer.memberId)

/** Orden: abiertas primero, por plazo más cercano (sin plazo al final). */
export function compareTasks(a: { status: string; dueDate: string | null }, b: { status: string; dueDate: string | null }) {
  const open = Number(a.status === 'completada') - Number(b.status === 'completada')
  if (open) return open
  return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')
}
