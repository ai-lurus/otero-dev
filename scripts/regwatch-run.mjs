// Corre el sync de RegWatch contra el servidor local (o el que indiques),
// igual que el cron: lee sitios, procesa la cola y genera los asuntos.
// Uso: pnpm regwatch:run [--url http://localhost:3000]
import { existsSync } from 'node:fs'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

const i = process.argv.indexOf('--url')
const base = (i > -1 ? process.argv[i + 1] : process.env.REGWATCH_URL) || 'http://localhost:3000'
const secret = process.env.CRON_SECRET
if (!secret) { console.error('Falta CRON_SECRET en .env'); process.exit(1) }

const MAX_STEPS = 40
const total = { newSources: 0, processed: 0, generated: 0, failed: 0 }
for (let step = 0; step < MAX_STEPS; step++) {
  const url = `${base}/api/cron/regwatch?step=${step}&chain=0`
  const res = await fetch(url, { headers: { authorization: `Bearer ${secret}` } }).catch((e) => {
    console.error(`No se pudo llamar a ${base}. ¿Está corriendo pnpm dev?`, e.message)
    process.exit(1)
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) { console.error(`Vuelta ${step}: ${res.status}`, body); process.exit(1) }
  for (const k of Object.keys(total)) total[k] += body[k] ?? 0
  console.log(`Vuelta ${step}: ${body.sites ?? 0} sitios, ${body.newSources} nuevas, ${body.processed} procesadas, ${body.generated} asuntos, ${body.failed} fallas`)
  if (!body.remaining) break
}
console.log(`Listo: ${total.newSources} publicaciones nuevas, ${total.processed} procesadas, ${total.generated} asuntos generados, ${total.failed} fallas`)
