// Copia a la base propia de un cliente los datos que ya tenía en la base
// principal (perfil, documentos, matriz regulatoria, etc.). No borra nada de la
// principal y no pisa filas que ya existan en la base del cliente (mismo id).
// Uso: pnpm tenant:copy <slug>   (antes: pnpm tenant:push <slug>)
import { createDecipheriv } from 'node:crypto'
import { existsSync } from 'node:fs'
import pg from 'pg'

for (const f of ['.env.local', '.env']) if (existsSync(f)) process.loadEnvFile(f)

// Fechas tal cual vienen (YYYY-MM-DD), sin pasar por Date y la zona horaria.
pg.types.setTypeParser(1082, (v) => v)

const slug = process.argv[2]
if (!slug) { console.error('Uso: pnpm tenant:copy <slug>'); process.exit(1) }

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

// Tabla -> columna del cliente. `tenants` primero: company_profiles la referencia.
const TABLES = [
  ['tenants', 'id'],
  ['company_profiles', 'tenantId'],
  ['documents', 'tenantId'],
  ['regulatory_items', 'tenant_id'],
  ['regulatory_item_events', 'tenant_id'],
  ['regulatory_item_evidence', 'tenant_id'],
  ['certifications', 'tenant_id'],
  ['services', 'tenantId'],
  ['payments', 'tenantId'],
  ['appointments', 'tenantId'],
]

const main = new pg.Client({ connectionString: process.env.DATABASE_URL })
await main.connect()
const tenant = (await main.query('select id, name, db_url_encrypted from tenants where slug = $1', [slug])).rows[0]
if (!tenant) { console.error(`No existe un cliente con slug "${slug}".`); process.exit(1) }
if (!tenant.db_url_encrypted) { console.error(`${tenant.name} no tiene base propia. Corre pnpm tenant:set-db ${slug}`); process.exit(1) }

const tdb = new pg.Client({ connectionString: decryptDbUrl(tenant.id, tenant.db_url_encrypted) })
await tdb.connect()
const q = (name) => `"${name.replace(/"/g, '""')}"`
try {
  for (const [table, column] of TABLES) {
    const { rows } = await main.query(`select * from ${q(table)} where ${q(column)} = $1`, [tenant.id])
    let copied = 0
    for (const row of rows) {
      // En la base del cliente nunca se guarda la URL de su propia base.
      if (table === 'tenants') row.db_url_encrypted = null
      const cols = Object.keys(row)
      const values = cols.map((c) => (row[c] !== null && typeof row[c] === 'object' && !(row[c] instanceof Date) ? JSON.stringify(row[c]) : row[c]))
      const res = await tdb.query(
        `insert into ${q(table)} (${cols.map(q).join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) on conflict do nothing`,
        values,
      )
      copied += res.rowCount
    }
    console.log(`${table}: ${copied} copiadas de ${rows.length}`)
  }
} catch (e) {
  if (e.code === '42P01') console.error(`Falta una tabla en la base del cliente. Corre primero pnpm tenant:push ${slug}`)
  throw e
} finally {
  await main.end()
  await tdb.end()
}
