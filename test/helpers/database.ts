import { createDatabase } from '@services/database/create-database.js'
import type { DB } from '@services/database/types/database.js'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'

const TEST_DATABASE_NAME = 'wisr_test'

// spatial_ref_sys is PostGIS reference data; truncating it breaks every geography cast
const PRESERVED_TABLES = ['cache_generation', 'species', 'spatial_ref_sys']

declare global {
  var __testDb: Kysely<DB> | null
}
globalThis.__testDb ??= null

export async function initializeTestDatabase(): Promise<Kysely<DB>> {
  if (globalThis.__testDb) {
    return globalThis.__testDb
  }

  globalThis.__testDb = createDatabase({
    url: process.env.TEST_DATABASE_URL,
    database: TEST_DATABASE_NAME,
  })

  return globalThis.__testDb
}

export function getTestDatabase(): Kysely<DB> {
  if (!globalThis.__testDb) {
    throw new Error('Test database not initialized')
  }
  return globalThis.__testDb
}

export async function resetDatabase(): Promise<void> {
  const db = getTestDatabase()

  const guard = await sql<{ db: string }>`
    SELECT current_database() AS db
  `.execute(db)
  const connected = guard.rows[0]?.db
  if (connected !== TEST_DATABASE_NAME) {
    throw new Error(
      `resetDatabase refused: connected to "${connected}", expected "${TEST_DATABASE_NAME}"`,
    )
  }

  const result = await sql<{ tablename: string }>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'kysely_%'
    AND tablename NOT IN (${sql.join(
      PRESERVED_TABLES.map((t) => sql.val(t)),
      sql`, `,
    )})
  `.execute(db)

  const tables = result.rows.map((r) => r.tablename)

  if (tables.length > 0) {
    await sql`TRUNCATE TABLE ${sql.join(
      tables.map((t) => sql.ref(t)),
      sql`, `,
    )} CASCADE`.execute(db)
  }
}

export async function cleanupTestDatabase(): Promise<void> {
  if (globalThis.__testDb) {
    await globalThis.__testDb.destroy()
    globalThis.__testDb = null
  }
}
