import type { DB } from '@services/database/types/database.js'
import { SQL } from 'bun'
import { Kysely } from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'

interface CreateDatabaseOptions {
  url?: string
  hostname?: string
  port?: number
  username?: string
  password?: string
  database?: string
  max?: number
  idleTimeout?: number
  maxLifetime?: number
}

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`${name} is required when DATABASE_URL is not set.`)
  }
  return value
}

export function createDatabase(options?: CreateDatabaseOptions): Kysely<DB> {
  const url = options?.url ?? process.env.DATABASE_URL
  // Capped so total across replicas fits under PgBouncer's per-user pool.
  const max = options?.max ?? 10
  // Disabled because Bun's idle reaper kills in-flight queries (oven-sh/bun#30646); maxLifetime still recycles connections.
  const idleTimeout = options?.idleTimeout ?? 0
  const maxLifetime = options?.maxLifetime ?? 1800

  const pool = {
    max,
    idleTimeout,
    maxLifetime,
    // Named prepared statements are session-scoped, which breaks under PgBouncer transaction pooling.
    prepare: false,
  }

  return new Kysely<DB>({
    dialect: new PostgresJSDialect({
      postgres: url
        ? new SQL({ url, ...pool })
        : new SQL({
            hostname: options?.hostname ?? requireEnv('DB_HOST'),
            port: options?.port ?? Number(requireEnv('DB_PORT')),
            username: options?.username ?? requireEnv('DB_USER'),
            password: options?.password ?? requireEnv('DB_PASSWORD'),
            database: options?.database ?? requireEnv('DB_NAME'),
            ...pool,
          }),
    }),
  })
}
