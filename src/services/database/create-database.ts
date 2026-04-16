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
}

export function createDatabase(options?: CreateDatabaseOptions): Kysely<DB> {
  const url = options?.url ?? process.env.DATABASE_URL

  return new Kysely<DB>({
    dialect: new PostgresJSDialect({
      postgres: url
        ? new SQL(url)
        : new SQL({
            hostname: options?.hostname ?? process.env.DB_HOST ?? 'localhost',
            port: options?.port ?? (Number(process.env.DB_PORT) || 5432),
            username: options?.username ?? process.env.DB_USER ?? 'postgres',
            password:
              options?.password ?? process.env.DB_PASSWORD ?? 'postgres',
            database: options?.database ?? process.env.DB_NAME ?? 'wisr',
            max: options?.max ?? 5,
          }),
    }),
  })
}
