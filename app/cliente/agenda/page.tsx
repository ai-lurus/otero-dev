import { getClientAppointments } from '@/app/actions/client-modules'

export default async function AgendaPage() {
  const rows = await getClientAppointments()
  return <div className="px-5 pt-6 pb-4 flex flex-col gap-5"><header><p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Calendario</p><h1 className="font-serif text-2xl font-semibold">Mi agenda</h1></header>{!rows.length ? <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-semibold">No hay citas programadas</p><p className="text-sm text-muted-foreground mt-1">Las citas confirmadas aparecerán aquí.</p></div> : <div className="flex flex-col gap-3">{rows.map((appointment) => <article key={appointment.id} className="rounded-2xl border border-border bg-card p-4"><p className="font-semibold text-sm">{appointment.title}</p><p className="text-xs text-muted-foreground mt-1">{new Date(appointment.startsAt).toLocaleString('es-MX')}</p><span className="inline-block mt-3 rounded-full bg-muted px-2 py-1 text-xs">{appointment.status}</span></article>)}</div>}</div>
}
