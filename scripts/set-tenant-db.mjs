// Guarda, cifrada, la URL de la base propia de un cliente (tenant).
// Uso: pnpm tenant:set-db <slug>                  cliente existente
//      pnpm tenant:set-db <slug> "<nombre>"       crea el cliente si no existe
// La URL se pide en la terminal sin mostrarla; nunca va en argumentos ni en el historial.
// Requiere DATABASE_URL y TENANT_DB_ENCRYPTION_KEY en .env.local o .env, y la columna
// tenants.db_url_encrypted creada (pnpm db:push).
import { createCipheriv, randomBytes, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import pg from 'pg'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

const [slug, name] = process.argv.slice(2)
if (!slug) {
  console.error('Uso: pnpm tenant:set-db <slug> ["<nombre>"]')
  process.exit(1)
}

// Mismo formato que lib/db/tenant-crypto.ts.
function encryptDbUrl(tenantId, url) {
  const key = Buffer.from(process.env.TENANT_DB_ENCRYPTION_KEY ?? '', 'base64')
  if (key.length !== 32) throw new Error('TENANT_DB_ENCRYPTION_KEY falta o no es de 32 bytes en base64')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(tenantId))
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

const main = new pg.Client({ connectionString: process.env.DATABASE_URL })
await main.connect()
try {
  const { rows } = await main.query('select id, name from tenants where slug = $1', [slug])
  if (!rows[0] && !name) {
    console.error(`No existe un cliente con slug "${slug}". Pasa también el nombre para crearlo.`)
    process.exit(1)
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

  if (rows[0]) {
    const { id } = rows[0]
    await main.query('update tenants set db_url_encrypted = $2 where id = $1', [id, encryptDbUrl(id, url)])
    console.log(`Base guardada para ${rows[0].name} (${slug})`)
  } else {
    const id = randomUUID()
    await main.query(
      'insert into tenants (id, name, slug, db_url_encrypted) values ($1, $2, $3, $4)',
      [id, name, slug, encryptDbUrl(id, url)],
    )
    console.log(`Cliente ${name} (${slug}) creado con id ${id}`)
  }
} finally {
  await main.end()
}
