import { defineConfig } from 'drizzle-kit'

// Esquema de la base de un cliente. No se usa directo: `pnpm tenant:push <slug>`
// descifra la URL del cliente y la pasa en TENANT_DB_URL.
export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/tenant-schema.ts',
  dbCredentials: { url: process.env.TENANT_DB_URL ?? '' },
})
