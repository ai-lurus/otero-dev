import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/app/actions/auth-helpers'
import { getAuditPage } from '@/app/actions/audit'
import { isTenantAdmin, listMyTenantUsers } from '@/app/actions/tenant-users'
import { AUDIT_CATEGORIES, actionLabel } from '@/lib/audit-actions'
import { Button } from '@/components/ui/button'

type Params = { categoria?: string; usuario?: string; desde?: string; hasta?: string; pagina?: string }

const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' })

const fieldCls = 'min-h-10 rounded-md border border-border-strong bg-surface-raised px-3 py-2 text-body-sm text-ink'

function pageHref(params: Params, page: number) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...params, pagina: String(page) })) if (value) query.set(key, value)
  return `/cliente/bitacora?${query.toString()}`
}

export default async function BitacoraPage({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in')
  if (!(await isTenantAdmin())) redirect('/cliente')

  const params = await searchParams
  const [{ rows, hasNext, page }, users] = await Promise.all([getAuditPage(params), listMyTenantUsers()])

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-display-md text-ink">Bitácora</h1>
        <p className="mt-2 text-body text-ink-muted">
          Cada acción de tu equipo en el portal: qué se hizo, quién lo hizo y cuándo. Las horas son de la Ciudad de México.
        </p>
      </header>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-raised p-4 shadow-xs">
        <label className="flex flex-col gap-1 text-label text-ink-muted">
          Tipo de acción
          <select name="categoria" defaultValue={params.categoria ?? ''} className={fieldCls}>
            <option value="">Todas</option>
            {Object.entries(AUDIT_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-label text-ink-muted">
          Persona
          <select name="usuario" defaultValue={params.usuario ?? ''} className={fieldCls}>
            <option value="">Todas</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-label text-ink-muted">
          Desde
          <input type="date" name="desde" defaultValue={params.desde ?? ''} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1 text-label text-ink-muted">
          Hasta
          <input type="date" name="hasta" defaultValue={params.hasta ?? ''} className={fieldCls} />
        </label>
        <Button type="submit" variant="secondary">Filtrar</Button>
        <Button asChild variant="link"><Link href="/cliente/bitacora">Quitar filtros</Link></Button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-raised p-8 text-center">
          <p className="text-heading text-ink">Sin movimientos</p>
          <p className="mt-1 text-body-sm text-ink-muted">No hay acciones registradas con estos filtros.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface-raised shadow-xs">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-surface-sunken text-label text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
                <th scope="col" className="px-4 py-3 font-medium">Persona</th>
                <th scope="col" className="px-4 py-3 font-medium">Acción</th>
                <th scope="col" className="px-4 py-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => (
                <tr key={row.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-data text-ink-muted">{dateTime.format(row.createdAt)}</td>
                  <td className="px-4 py-3 text-body-sm text-ink">{row.userName || 'Sistema'}</td>
                  <td className="px-4 py-3 text-body-sm text-ink">{actionLabel(row.action)}</td>
                  <td className="px-4 py-3 text-body-sm text-ink">
                    {row.entityLabel && <span className="font-medium">{row.entityLabel}</span>}
                    {row.detail && <span className="block text-ink-muted">{row.detail}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(page > 1 || hasNext) && (
        <nav className="mt-4 flex items-center justify-between" aria-label="Paginación">
          {page > 1 ? <Button asChild variant="secondary" size="sm"><Link href={pageHref(params, page - 1)}>Ver más recientes</Link></Button> : <span />}
          {hasNext && <Button asChild variant="secondary" size="sm"><Link href={pageHref(params, page + 1)}>Ver anteriores</Link></Button>}
        </nav>
      )}
    </div>
  )
}
