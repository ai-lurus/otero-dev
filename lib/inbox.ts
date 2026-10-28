// Bandeja de asuntos: carpetas, prioridad y orden a partir de los campos que ya
// tiene cada asunto. Cuando exista el puntaje del matching, `bandOf` lo usa.

export const FOLDERS = [
  { id: 'por_revisar', label: 'Por revisar', status: 'identificada' },
  { id: 'en_seguimiento', label: 'En seguimiento', status: 'aceptada' },
  { id: 'para_despues', label: 'Para después', status: 'diferida' },
  { id: 'cerrados', label: 'Cerrados', status: 'cerrada' },
  { id: 'todos', label: 'Todos', status: null },
] as const
export type FolderId = (typeof FOLDERS)[number]['id']

export const BANDS = ['critica', 'alta', 'media', 'baja'] as const
export type Band = (typeof BANDS)[number]
export const BAND_LABELS: Record<Band, string> = { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }

const DAY_MS = 86_400_000

type InboxFields = {
  status: string
  impact: string | null
  dueDate: string | null
  publishedAt: string | null
  updatedAt: Date | string
}

/** Días que faltan para el plazo (negativo si ya venció); null si no tiene plazo. */
export function daysUntil(dueDate: string | null, today = new Date()): number | null {
  if (!dueDate) return null
  const due = new Date(`${dueDate}T00:00:00`)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((due.getTime() - start.getTime()) / DAY_MS)
}

/** Prioridad provisional: impacto del asunto más qué tan cerca está su plazo. */
export function bandOf(item: InboxFields, today = new Date()): Band {
  const days = daysUntil(item.dueDate, today)
  const near = days !== null && days <= 15
  const soon = days !== null && days <= 30
  if (item.impact === 'alto') return near ? 'critica' : 'alta'
  if (item.impact === 'medio') return soon ? 'alta' : 'media'
  if (near) return 'media'
  return 'baja'
}

export function inFolder(item: InboxFields, folder: FolderId) {
  const status = FOLDERS.find((entry) => entry.id === folder)?.status
  return status ? item.status === status : true
}

const time = (value: string | Date | null) => (value ? new Date(value).getTime() : 0)

/** Orden de la bandeja: banda, luego plazo más cercano, luego lo más reciente. */
export function compareInbox(a: InboxFields, b: InboxFields, today = new Date()) {
  const band = BANDS.indexOf(bandOf(a, today)) - BANDS.indexOf(bandOf(b, today))
  if (band) return band
  const dueA = daysUntil(a.dueDate, today) ?? Infinity
  const dueB = daysUntil(b.dueDate, today) ?? Infinity
  if (dueA !== dueB) return dueA - dueB
  return time(b.publishedAt ?? b.updatedAt) - time(a.publishedAt ?? a.updatedAt)
}

/** Texto del plazo para el chip: "Vence en 5 días", "Venció hace 2 días". */
export function deadlineLabel(dueDate: string | null, today = new Date()) {
  const days = daysUntil(dueDate, today)
  if (days === null) return null
  if (days < 0) return `Venció hace ${-days} ${-days === 1 ? 'día' : 'días'}`
  if (days === 0) return 'Vence hoy'
  return `Vence en ${days} ${days === 1 ? 'día' : 'días'}`
}
