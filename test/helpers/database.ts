import { createDatabase } from '@services/database/create-database.js'
import type { DB } from '@services/database/types/database.js'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'

declare global {
  var __testDb: Kysely<DB> | null
}
globalThis.__testDb ??= null

/**
 * Initialize the test database connection.
 * Migrations are handled by global-setup.ts so this only creates the
 * Kysely instance (once per worker process).
 */
export async function initializeTestDatabase(): Promise<Kysely<DB>> {
  if (globalThis.__testDb) {
    return globalThis.__testDb
  }

  globalThis.__testDb = createDatabase({
    url: process.env.TEST_DATABASE_URL,
    database: 'wars_test',
  })

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
