import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

function getDatabaseConnectionString() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) return connectionString

  const databaseUrl = new URL(connectionString)
  const sslmode = databaseUrl.searchParams.get('sslmode')

  if (sslmode && ['prefer', 'require', 'verify-ca'].includes(sslmode)) {
    databaseUrl.searchParams.set('sslmode', 'verify-full')
  }

  return databaseUrl.toString()
}

export const pool = new Pool({
  connectionString: getDatabaseConnectionString(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

export const db = drizzle(pool, { schema })
