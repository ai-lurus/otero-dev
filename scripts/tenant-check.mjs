// Revisa que los usuarios de un cliente (base principal) y su tabla `members`
// (base del cliente) coincidan. Solo lee; no cambia nada.
// Uso: pnpm tenant:check <slug>
import { createDecipheriv } from 'node:crypto'
import { existsSync } from 'node:fs'
import pg from 'pg'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

const slug = process.argv[2]
if (!slug) { console.error('Uso: pnpm tenant:check <slug>'); process.exit(1) }

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
let tenant, users
try {
  tenant = (await main.query('select id, name, db_url_encrypted from tenants where slug = $1', [slug])).rows[0]
  if (!tenant) { console.error(`No existe un cliente con slug "${slug}".`); process.exit(1) }
  if (!tenant.db_url_encrypted) { console.error(`${tenant.name} no tiene base propia.`); process.exit(1) }
  users = (await main.query(
    `select u.id, u.email from user_tenants ut join "user" u on u.id = ut."userId"
     where ut."tenantId" = $1 and ut.role = 'client'`, [tenant.id])).rows
} finally {
  await main.end()
}

const tdb = new pg.Client({ connectionString: decryptDbUrl(tenant.id, tenant.db_url_encrypted) })
await tdb.connect()
let rows
try {
  rows = (await tdb.query('select main_user_id, name, active from members')).rows
} finally {
  await tdb.end()
}

const active = new Set(rows.filter((m) => m.active).map((m) => m.main_user_id))
const userIds = new Set(users.map((u) => u.id))
const sinMember = users.filter((u) => !active.has(u.id))
const sinUsuario = rows.filter((m) => m.active && !userIds.has(m.main_user_id))

console.log(`${tenant.name}: ${users.length} usuarios, ${active.size} members activos`)
for (const u of sinMember) console.log(`  usuario sin member activo: ${u.email}`)
for (const m of sinUsuario) console.log(`  member activo sin usuario: ${m.name} (${m.main_user_id})`)
if (!sinMember.length && !sinUsuario.length) console.log('Todo coincide.')
process.exit(sinMember.length || sinUsuario.length ? 2 : 0)
