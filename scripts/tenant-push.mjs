// Crea/actualiza las tablas en la base de un cliente (tenant).
// Uso: pnpm tenant:push <slug>
// Descifra tenants.db_url_encrypted y corre `drizzle-kit push` con el esquema de
// lib/db/tenant-schema.ts. La URL solo pasa por el entorno del proceso hijo.
import { createDecipheriv } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import pg from 'pg'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

const slug = process.argv[2]
if (!slug) {
  console.error('Uso: pnpm tenant:push <slug>')
  process.exit(1)
}

// Mismo formato que lib/db/tenant-crypto.ts.
function decryptDbUrl(tenantId, value) {
  const key = Buffer.from(process.env.TENANT_DB_ENCRYPTION_KEY ?? '', 'base64')
  if (key.length !== 32) throw new Error('TENANT_DB_ENCRYPTION_KEY falta o no es de 32 bytes en base64')
  const [version, iv, tag, data] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Cadena de conexión cifrada inválida')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  decipher.setAAD(Buffer.from(tenantId))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

const main = new pg.Client({ connectionString: process.env.DATABASE_URL })
await main.connect()
let tenant
try {
  const { rows } = await main.query('select id, name, db_url_encrypted from tenants where slug = $1', [slug])
  tenant = rows[0]
} finally {
  await main.end()
}
if (!tenant) { console.error(`No existe un cliente con slug "${slug}".`); process.exit(1) }
if (!tenant.db_url_encrypted) { console.error(`${tenant.name} no tiene base propia. Corre pnpm tenant:set-db ${slug}`); process.exit(1) }

console.log(`Aplicando esquema a la base de ${tenant.name} (${slug})...`)
const run = spawnSync('pnpm', ['exec', 'drizzle-kit', 'push', '--config', 'drizzle.tenant.config.ts'], {
  stdio: 'inherit',
  env: { ...process.env, TENANT_DB_URL: decryptDbUrl(tenant.id, tenant.db_url_encrypted) },
})
process.exit(run.status ?? 1)
