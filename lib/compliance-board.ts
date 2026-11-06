import { daysUntil } from '@/lib/inbox'
import { EXECUTION_LABELS, EXECUTION_STATUSES } from '@/lib/regulatory'

// Tablero "Mi cumplimiento": etapas de ejecución, vistas y filtros de un asunto
// ya aceptado por el director (admin del cliente).

export type Stage = (typeof EXECUTION_STATUSES)[number]
export const STAGES = EXECUTION_STATUSES
export const stageLabel = (stage: Stage) => EXECUTION_LABELS[stage]

export const isStage = (value: unknown): value is Stage =>
  typeof value === 'string' && (STAGES as readonly string[]).includes(value)

export const nextStage = (stage: Stage): Stage | null => STAGES[STAGES.indexOf(stage) + 1] ?? null
export const prevStage = (stage: Stage): Stage | null => STAGES[STAGES.indexOf(stage) - 1] ?? null

/** El equipo ejecuta hasta En revisión; marcar como cumplido es del director al revisar. */
export const canMoveTo = (to: Stage, isDirector: boolean) => isDirector || to !== 'cumplido'

export const BOARD_VIEWS = [
  { id: 'tablero', label: 'Tablero' },
  { id: 'vencidos', label: 'Vencidos' },
  { id: 'por_vencer', label: 'Por vencer en 7 días' },
  { id: 'cumplidos', label: 'Cumplidos' },
] as const
export type BoardView = (typeof BOARD_VIEWS)[number]['id']

export const DUE_FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'vencidos', label: 'Vencidos' },
  { value: 'semana', label: 'En 7 días' },
  { value: 'mes', label: 'En 30 días' },
  { value: 'sin_plazo', label: 'Sin plazo' },
] as const
export type DueFilter = (typeof DUE_FILTERS)[number]['value']

type BoardFields = { executionStatus: string | null; dueDate: string | null }

export const stageOf = (item: BoardFields): Stage => (isStage(item.executionStatus) ? item.executionStatus : 'por_hacer')

export function inBoardView(item: BoardFields, view: BoardView, today = new Date()) {
  const open = stageOf(item) !== 'cumplido'
  const days = daysUntil(item.dueDate, today)
  switch (view) {
    case 'vencidos':
      return open && days !== null && days < 0
    case 'por_vencer':
      return open && days !== null && days >= 0 && days <= 7
    case 'cumplidos':
      return !open
    default:
      return true
  }
}

/** Contador del menú: en Tablero cuenta lo pendiente, no lo cumplido. */
export function viewCount(items: BoardFields[], view: BoardView, today = new Date()) {
  if (view === 'tablero') return items.filter((item) => stageOf(item) !== 'cumplido').length
  return items.filter((item) => inBoardView(item, view, today)).length
}

export function matchesDue(item: BoardFields, filter: DueFilter, today = new Date()) {
  const days = daysUntil(item.dueDate, today)
  switch (filter) {
    case 'vencidos':
      return days !== null && days < 0
    case 'semana':
      return days !== null && days >= 0 && days <= 7
    case 'mes':
      return days !== null && days >= 0 && days <= 30
    case 'sin_plazo':
      return days === null
    default:
      return true
  }
}

/** Columnas que muestra cada vista: Cumplidos solo la suya. */
export const columnsFor = (view: BoardView): readonly Stage[] => (view === 'cumplidos' ? ['cumplido'] : STAGES)
