import { after, NextResponse, type NextRequest } from 'next/server'
import { runNews } from '@/lib/news/sync'

// Sync de Noticias: lo llama GitHub Actions (.github/workflows/noticias.yml) con
// Authorization: Bearer $CRON_SECRET. Si quedan notas por leer, se vuelve a llamar solo.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const BUDGET_MS = 40_000
const MAX_CHAIN = 20

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const step = Number(request.nextUrl.searchParams.get('step') ?? '0') || 0
  const chain = request.nextUrl.searchParams.get('chain') !== '0'
  try {
    const run = await runNews({ budgetMs: BUDGET_MS, syncSources: step === 0 })
    if (chain && run.remaining && step < MAX_CHAIN) {
      const next = new URL(request.nextUrl.pathname, request.nextUrl.origin)
      next.searchParams.set('step', String(step + 1))
      after(async () => {
        await fetch(next, { headers: { authorization: `Bearer ${secret}` } }).catch((e) => console.error('noticias chain', e))
      })
    }
    return NextResponse.json({ step, ...run })
  } catch (e) {
    console.error('noticias cron', e)
    return NextResponse.json({ error: 'Falló el sync de Noticias' }, { status: 500 })
  }
}
