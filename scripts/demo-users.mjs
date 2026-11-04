// Crea las personas demo de una empresa cliente (o les repone la contraseña si
// ya existen): login en la principal, membresía y `members` en su base propia.
// La lista repite lib/demo-users.ts; si cambia allá, cambia aquí.
// Uso: pnpm demo:users <slug>   (contraseña: DEMO_PASSWORD de .env)
import { randomUUID, createDecipheriv } from 'node:crypto'
import { existsSync } from 'node:fs'
import pg from 'pg'
import { hashPassword } from 'better-auth/crypto'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

const PERSONAS = [
  { local: 'admin', name: 'Mariana Torres', role: 'tenant_admin' },
  { local: 'ambiental', name: 'Jorge Medina', role: 'client' },
  { local: 'cumplimiento', name: 'Lucía Ramírez', role: 'client' },
]

const slug = process.argv[2]
if (!slug) { console.error('Uso: pnpm demo:users <slug>'); process.exit(1) }
const password = process.env.DEMO_PASSWORD
if (!password || password.length < 8) { console.error('Define DEMO_PASSWORD (8 caracteres o más) en .env'); process.exit(1) }
if (!process.env.DATABASE_URL) { console.error('Falta DATABASE_URL en .env'); process.exit(1) }

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

const memberRole = (role) => (role === 'tenant_admin' ? 'admin' : 'member')
const main = new pg.Client({ connectionString: process.env.DATABASE_URL })
await main.connect()
const created = []
let tenant

try {
  tenant = (await main.query('select id, name, db_url_encrypted from tenants where slug = $1', [slug])).rows[0]
  if (!tenant) throw new Error(`No existe un cliente con slug "${slug}". Regístralo en /admin/tenants o en /admin/demo.`)
  const hash = await hashPassword(password)
  await main.query('BEGIN')
  for (const p of PERSONAS) {
    const email = `${p.local}@${slug}.demo`
    let id = (await main.query('select id, name from "user" where email = $1', [email])).rows[0]?.id
    if (id) {
      const acc = await main.query(
        `update account set password = $1, "updatedAt" = now() where "userId" = $2 and "providerId" = 'credential'`, [hash, id])
      if (acc.rowCount !== 1) throw new Error(`${email}: sin cuenta con contraseña`)
    } else {
      id = randomUUID().replace(/-/g, '')
      await main.query('insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, true)', [id, p.name, email])
      await main.query(
        `insert into account (id, "accountId", "providerId", "userId", password) values ($1, $2, 'credential', $2, $3)`,
        [randomUUID().replace(/-/g, ''), id, hash])
    }
    await main.query(
      `insert into user_tenants (id, "userId", "tenantId", role) values ($1, $2, $3, $4)
       on conflict ("userId", "tenantId") do update set role = excluded.role`,
      [`ut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, id, tenant.id, p.role])
    created.push({ ...p, id, email })
  }
  await main.query('COMMIT')
} catch (e) {
  await main.query('ROLLBACK').catch(() => {})
  console.error('ERROR, no se cambió nada:', e.message)
  process.exitCode = 1
} finally {
  await main.end()
}

// La base del cliente no entra en la transacción: si falla, el login ya existe
// y basta con volver a correr el script.
if (!process.exitCode && tenant.db_url_encrypted) {
  const tdb = new pg.Client({ connectionString: decryptDbUrl(tenant.id, tenant.db_url_encrypted) })
  await tdb.connect()
  try {
    for (const p of created) {
      await tdb.query(
        `insert into members (id, main_user_id, name, role) values ($1, $2, $3, $4)
         on conflict (main_user_id) do update set name = excluded.name, role = excluded.role, active = true, updated_at = now()`,
        [`m-${randomUUID()}`, p.id, p.name, memberRole(p.role)])
    }
  } catch (e) {
    console.error(`Los usuarios quedaron creados, pero falló members en la base de ${tenant.name}: ${e.message}. Vuelve a correr el script.`)
    process.exitCode = 1
  } finally {
    await tdb.end()
  }
}

if (!process.exitCode) {
  console.log(`${tenant.name}: usuarios demo listos (contraseña: la de DEMO_PASSWORD)`)
  for (const p of created) console.log(`  ${p.role === 'tenant_admin' ? 'admin ' : 'equipo'}  ${p.email}  ${p.name}`)
  console.log(`Entra en /login/${slug}`)
}
