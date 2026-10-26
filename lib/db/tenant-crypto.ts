import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// Cifrado de la cadena de conexión de la base de cada cliente (tenant) con AES-256-GCM.
// La llave maestra es TENANT_DB_ENCRYPTION_KEY (32 bytes en base64,
// `openssl rand -base64 32`). El id del tenant va como AAD, así un valor
// cifrado no se puede copiar a otra fila. Formato: v1.<iv>.<tag>.<cifrado>.
// scripts/set-tenant-db.mjs repite este formato; si cambia aquí, cambia allá.

function key() {
  const raw = process.env.TENANT_DB_ENCRYPTION_KEY
  if (!raw) throw new Error('Falta TENANT_DB_ENCRYPTION_KEY')
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error('TENANT_DB_ENCRYPTION_KEY debe ser de 32 bytes en base64')
  return buf
}

export function encryptDbUrl(tenantId: string, url: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  cipher.setAAD(Buffer.from(tenantId))
  const data = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()])
  return ['v1', iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.')
}

export function decryptDbUrl(tenantId: string, value: string) {
  const [version, iv, tag, data] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Cadena de conexión cifrada inválida')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAAD(Buffer.from(tenantId))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}
