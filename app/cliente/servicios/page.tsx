import Link from 'next/link'
import { getClientServices } from '@/app/actions/client-modules'

export default async function ServiciosPage() {
  const rows = await getClientServices()
  const active = rows.filter((row) => !['completed', 'cancelled'].includes(row.status))
  const completed = rows.filter((row) => ['completed', 'cancelled'].includes(row.status))
  return <div className="px-5 pt-6 pb-4 flex flex-col gap-5">
    <header className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Tu empresa</p><h1 className="font-serif text-2xl font-semibold">Mis Servicios</h1></div><Link href="/cliente/solicitar" className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-3 rounded-xl">Solicitar</Link></header>
    <section className="flex flex-col gap-3">
      {active.map((service) => <Link key={service.id} href={`/cliente/servicios/${service.id}`} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{service.name}</p><p className="text-xs text-muted-foreground mt-1">{service.description || 'Sin descripción'}</p></div><span className="text-xs rounded-full bg-muted px-2 py-1">{service.status}</span></div></Link>)}
      {!rows.length && <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-semibold">Aún no hay servicios</p><p className="text-sm text-muted-foreground mt-1">Los servicios de tu empresa aparecerán aquí.</p></div>}
      {!!rows.length && !active.length && <p className="text-sm text-muted-foreground">No hay servicios activos.</p>}
    </section>
    {!!completed.length && <section><h2 className="text-sm font-semibold mb-3">Histórico</h2><div className="flex flex-col gap-2">{completed.map((service) => <div key={service.id} className="rounded-xl border border-border p-3 text-sm">{service.name}<span className="text-xs text-muted-foreground ml-2">{service.status}</span></div>)}</div></section>}
  </div>
}
