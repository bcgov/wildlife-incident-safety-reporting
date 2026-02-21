import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import type { DB } from '@services/database/types/database.js'
import { SQL } from 'bun'
import { FileMigrationProvider, Kysely, Migrator, sql } from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'

declare global {
  var __testDb: Kysely<DB> | null
}
globalThis.__testDb ??= null

/**
 * Initialize the test database connection and run migrations.
 * Requires a running PostgreSQL instance with a test database.
 *
 * Set TEST_DATABASE_URL or individual DB_* env vars in global-setup.ts.
 */
export async function initializeTestDatabase(): Promise<Kysely<DB>> {
  if (globalThis.__testDb) {
    return globalThis.__testDb
  }

  globalThis.__testDb = new Kysely<DB>({
    dialect: new PostgresJSDialect({
      postgres: process.env.TEST_DATABASE_URL
        ? new SQL(process.env.TEST_DATABASE_URL)
        : new SQL({
            hostname: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            database: process.env.DB_NAME || 'wars_test',
          }),
    }),
  })

  const migrator = new Migrator({
    db: globalThis.__testDb,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve(
        import.meta.dir,
        '../../migrations/migrations',
      ),
    }),
  })

  const { error } = await migrator.migrateToLatest()
  if (error) {
    throw new Error(`Test migration failed: ${error}`)
  }

  return globalThis.__testDb
}

/**
 * Get the current test database connection.
 * Throws if database has not been initialized.
 */
export function getTestDatabase(): Kysely<DB> {
  if (!globalThis.__testDb) {
    throw new Error('Test database not initialized')
  }
  return globalThis.__testDb
}

/**
 * Reset database by truncating all tables.
 * Call this in beforeEach hooks to ensure clean state between tests.
 */
export async function resetDatabase(): Promise<void> {
  const db = getTestDatabase()

  const result = await sql<{ tablename: string }>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'kysely_%'
  `.execute(db)

  const tables = result.rows.map((r) => r.tablename)

  if (tables.length > 0) {
    await sql`TRUNCATE TABLE ${sql.join(
      tables.map((t) => sql.ref(t)),
      sql`, `,
    )} CASCADE`.execute(db)
  }
}

/**
 * Clean up the test database connection.
 * Should be called in global teardown.
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (globalThis.__testDb) {
    await globalThis.__testDb.destroy()
    globalThis.__testDb = null
  }
}
