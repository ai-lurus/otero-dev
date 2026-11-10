// Crea el administrador (tenant_admin) de un cliente con una contraseña generada,
// o le genera una nueva si ya existe. La contraseña se muestra una sola vez.
// Uso: pnpm tenant:admin <slug> <correo> ["<nombre>"]
import { randomBytes, randomUUID, createDecipheriv } from 'node:crypto'
import { existsSync } from 'node:fs'
import pg from 'pg'
import { hashPassword } from 'better-auth/crypto'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

const [slug, rawEmail, name = 'Administrador'] = process.argv.slice(2)
const email = rawEmail?.trim().toLowerCase()
if (!slug || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Uso: pnpm tenant:admin <slug> <correo> ["<nombre>"]')
  process.exit(1)
}
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

// 18 bytes al azar en base64url: 24 caracteres sin símbolos ambiguos para copiar.
const password = randomBytes(18).toString('base64url')
const main = new pg.Client({ connectionString: process.env.DATABASE_URL })
await main.connect()
let tenant, userId

try {
  tenant = (await main.query('select id, name, db_url_encrypted from tenants where slug = $1', [slug])).rows[0]
  if (!tenant) throw new Error(`No existe un cliente con slug "${slug}".`)
  const hash = await hashPassword(password)
  await main.query('BEGIN')
  userId = (await main.query('select id from "user" where email = $1', [email])).rows[0]?.id
  if (userId) {
    const acc = await main.query(
      `update account set password = $1, "updatedAt" = now() where "userId" = $2 and "providerId" = 'credential'`, [hash, userId])
    if (acc.rowCount !== 1) throw new Error(`${email}: sin cuenta con contraseña`)
  } else {
    userId = randomUUID().replace(/-/g, '')
    await main.query('insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, true)', [userId, name, email])
    await main.query(
      `insert into account (id, "accountId", "providerId", "userId", password) values ($1, $2, 'credential', $2, $3)`,
      [randomUUID().replace(/-/g, ''), userId, hash])
  }
  await main.query(
    `insert into user_tenants (id, "userId", "tenantId", role) values ($1, $2, $3, 'tenant_admin')
     on conflict ("userId", "tenantId") do update set role = excluded.role`,
    [`ut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, userId, tenant.id])
  await main.query('COMMIT')
} catch (e) {
  await main.query('ROLLBACK').catch(() => {})
  console.error('ERROR, no se cambió nada:', e.message)
  process.exit(1)
} finally {
  await main.end()
}

// La base del cliente no entra en la transacción: si falla, basta con volver a correr el script.
if (tenant.db_url_encrypted) {
  const tdb = new pg.Client({ connectionString: decryptDbUrl(tenant.id, tenant.db_url_encrypted) })
  await tdb.connect()
  try {
    await tdb.query(
      `insert into members (id, main_user_id, name, role) values ($1, $2, $3, 'admin')
       on conflict (main_user_id) do update set name = excluded.name, role = excluded.role, active = true, updated_at = now()`,
      [`m-${randomUUID()}`, userId, name])
  } catch (e) {
    console.error(`El usuario quedó creado, pero falló members en la base de ${tenant.name}: ${e.message}. Vuelve a correr el script.`)
    process.exit(1)
  } finally {
    await tdb.end()
  }
}

console.log(`${tenant.name}: administrador listo`)
console.log(`  correo:     ${email}`)
console.log(`  contraseña: ${password}   (guárdala; no se vuelve a mostrar)`)
console.log(`Entra en /login/${slug}`)
