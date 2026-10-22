"use client"

export default function AgendaError({ reset }: { reset: () => void }) {
  return (
    <main className="px-5 py-12 text-center">
      <h1 className="text-lg font-semibold text-foreground">No pudimos cargar tu agenda</h1>
      <p className="mt-2 text-sm text-muted-foreground">Intenta nuevamente. Si el problema continúa, contacta a soporte.</p>
      <button onClick={reset} className="mt-5 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Reintentar</button>
    </main>
  )
}
