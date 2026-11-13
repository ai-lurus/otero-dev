'use server'

import { getAccess } from '@/lib/access'
import { listAuditLog } from '@/lib/audit'
import { AUDIT_CATEGORIES, type AuditCategory } from '@/lib/audit-actions'

// Lectura de la bitácora: solo el director de la empresa, y solo la de su empresa.

export const AUDIT_PAGE_SIZE = 50

const isCategory = (value?: string): value is AuditCategory => Boolean(value && value in AUDIT_CATEGORIES)

/** Fecha 'YYYY-MM-DD' como inicio o fin de ese día en hora de México (UTC-6, sin horario de verano). */
function mexicoDay(value: string | undefined, end: boolean): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}-06:00`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function getAuditPage(params: { categoria?: string; usuario?: string; desde?: string; hasta?: string; pagina?: string }) {
  const access = await getAccess()
  if (!access?.isDirector) throw new Error('Forbidden')
  const page = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1)
  const rows = await listAuditLog(access.tenantId, {
    category: isCategory(params.categoria) ? params.categoria : undefined,
    userId: params.usuario || undefined,
    from: mexicoDay(params.desde, false),
    to: mexicoDay(params.hasta, true),
    limit: AUDIT_PAGE_SIZE + 1,
    offset: (page - 1) * AUDIT_PAGE_SIZE,
  })
  return { rows: rows.slice(0, AUDIT_PAGE_SIZE), hasNext: rows.length > AUDIT_PAGE_SIZE, page }
}
