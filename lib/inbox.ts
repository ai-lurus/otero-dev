// Bandeja de asuntos: carpetas, prioridad y orden a partir de los campos que ya
// tiene cada asunto. Cuando exista el puntaje del matching, `bandOf` lo usa.

/** Vistas de RegWatch. `history` las agrupa bajo "Historial" en el menú. */
export const VIEWS = [
  { id: 'bandeja', label: 'Bandeja · sin revisar', history: false },
  { id: 'impacto_alto', label: 'Impacto alto', history: false },
  { id: 'vencen_7', label: 'Urgentes', history: false },
  { id: 'seguimiento', label: 'En seguimiento', history: false },
  { id: 'todo', label: 'Todo', history: true },
  { id: 'descartados', label: 'Descartados', history: true },
  { id: 'archivo', label: 'Archivo', history: true },
] as const
export type ViewId = (typeof VIEWS)[number]['id']

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

export function inView(item: InboxFields, view: ViewId, today = new Date()) {
  switch (view) {
    case 'bandeja':
      return item.status === 'identificada'
    case 'impacto_alto':
      return item.status === 'identificada' && item.impact === 'alto'
    case 'vencen_7': {
      const days = daysUntil(item.dueDate, today)
      return item.status === 'identificada' && days !== null && days <= 7
    }
    case 'seguimiento':
      return item.status === 'aceptada'
    case 'descartados':
      return item.status === 'descartada'
    case 'archivo':
      return item.status === 'archivada'
    default:
      return true
  }
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

const dayOf = (item: { publishedAt: string | null; updatedAt: Date | string }) =>
  item.publishedAt ?? new Date(item.updatedAt).toISOString().slice(0, 10)

/** Día del asunto (AAAA-MM-DD): cuándo se publicó. */
export const itemDay = dayOf

/** Plazo para la tabla: "En 29 días", "Vence hoy", "Venció hace 2 días" o null. */
export function dueShort(dueDate: string | null, today = new Date()) {
  const days = daysUntil(dueDate, today)
  if (days === null) return null
  if (days < 0) return `Venció hace ${-days} ${-days === 1 ? 'día' : 'días'}`
  if (days === 0) return 'Vence hoy'
  return `En ${days} ${days === 1 ? 'día' : 'días'}`
}
