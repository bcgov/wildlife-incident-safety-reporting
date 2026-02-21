import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { SQL } from 'bun'
import { FileMigrationProvider, Kysely, Migrator } from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'

const db = new Kysely({
  dialect: new PostgresJSDialect({
    postgres: process.env.DATABASE_URL
      ? new SQL(process.env.DATABASE_URL)
      : new SQL({
          hostname: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT) || 5432,
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'wars',
        }),
  }),
})

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.resolve(import.meta.dir, 'migrations'),
  }),
})

async function rollback() {
  const { error, results } = await migrator.migrateDown()

  for (const result of results ?? []) {
    if (result.status === 'Success') {
      console.log(
        `Migration "${result.migrationName}" rolled back successfully`,
      )
    } else if (result.status === 'Error') {
      console.error(`Migration "${result.migrationName}" rollback failed`)
    }
  }

  if (error) {
    console.error('Rollback failed:', error)
  }

  await db.destroy()
}

rollback()
