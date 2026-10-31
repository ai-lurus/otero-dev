import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { explicitSsl } from './pg-url'
import * as schema from './schema'

export const pool = new Pool({ connectionString: explicitSsl(process.env.DATABASE_URL) })
export const db = drizzle(pool, { schema })
