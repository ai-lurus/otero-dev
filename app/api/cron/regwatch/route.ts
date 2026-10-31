import { after, NextResponse, type NextRequest } from 'next/server'
import { runRegwatch } from '@/lib/ingest/regwatch'

// Sync de RegWatch: Vercel Cron lo llama a diario (vercel.json) con
// Authorization: Bearer $CRON_SECRET. Si queda trabajo, se vuelve a llamar solo.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const BUDGET_MS = 45_000
const MAX_CHAIN = 40

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET no está configurado' }, { status: 500 })
  if (!isAuthorized(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const step = Number(request.nextUrl.searchParams.get('step') ?? '0') || 0
  // chain=0: quien llama sigue las vueltas (pnpm regwatch:run) y no se encadena solo.
  const chain = request.nextUrl.searchParams.get('chain') !== '0'
  try {
    const run = await runRegwatch({ budgetMs: BUDGET_MS, syncSites: step === 0 })
    if (chain && run.remaining && step < MAX_CHAIN) {
      const next = new URL(request.nextUrl.pathname, request.nextUrl.origin)
      next.searchParams.set('step', String(step + 1))
      after(async () => {
        await fetch(next, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }).catch((e) => console.error('regwatch chain', e))
      })
    }
    return NextResponse.json({ step, ...run })
  } catch (e) {
    console.error('regwatch cron', e)
    return NextResponse.json({ error: 'Falló el sync de RegWatch' }, { status: 500 })
  }
}
