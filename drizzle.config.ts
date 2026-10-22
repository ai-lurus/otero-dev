import { existsSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit does not read .env.local on its own.
if (!process.env.DATABASE_URL && existsSync('.env.local')) process.loadEnvFile('.env.local')

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
})
