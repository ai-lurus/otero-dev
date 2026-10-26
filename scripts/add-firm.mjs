// Da de alta un despacho y guarda la URL de su base cifrada.
// Uso: pnpm firm:add <slug> "<nombre>"
// La URL se pide en la terminal sin mostrarla; nunca va en argumentos ni en el historial.
// Requiere DATABASE_URL y TENANT_DB_ENCRYPTION_KEY en .env.local o .env, y la tabla
// `firms` creada (pnpm db:push).
import { createCipheriv, randomBytes, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import pg from 'pg'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

const [slug, name] = process.argv.slice(2)
if (!slug || !name) {
  console.error('Uso: pnpm firm:add <slug> "<nombre>"')
  process.exit(1)
}

// Mismo formato que lib/db/tenant-crypto.ts.
function encryptDbUrl(firmId, url) {
  const key = Buffer.from(process.env.TENANT_DB_ENCRYPTION_KEY ?? '', 'base64')
  if (key.length !== 32) throw new Error('TENANT_DB_ENCRYPTION_KEY falta o no es de 32 bytes en base64')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(firmId))
  const data = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()])
  return ['v1', iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.')
}

function askHidden(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => { if (s.includes(prompt)) rl.output.write(s) }
    rl.question(prompt, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer.trim()) })
  })
}

const url = await askHidden(`URL de la base de ${slug} (no se muestra): `)
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error('No parece una URL de Postgres.')
  process.exit(1)
}

// Probar la conexión antes de guardarla.
const tenant = new pg.Client({ connectionString: url })
await tenant.connect()
await tenant.query('select 1')
await tenant.end()

const id = randomUUID()
const main = new pg.Client({ connectionString: process.env.DATABASE_URL })
await main.connect()
try {
  await main.query(
    'insert into firms (id, slug, name, db_url_encrypted) values ($1, $2, $3, $4)',
    [id, slug, name, encryptDbUrl(id, url)],
  )
  console.log(`Despacho ${slug} creado con id ${id}`)
} finally {
  await main.end()
}
