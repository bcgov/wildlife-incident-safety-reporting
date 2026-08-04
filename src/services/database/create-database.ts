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
            hostname: options?.hostname ?? process.env.DB_HOST ?? 'localhost',
            port: options?.port ?? (Number(process.env.DB_PORT) || 5432),
            username: options?.username ?? process.env.DB_USER ?? 'postgres',
            password:
              options?.password ?? process.env.DB_PASSWORD ?? 'postgres',
            database: options?.database ?? process.env.DB_NAME ?? 'wisr',
            ...pool,
          }),
    }),
  })
}
