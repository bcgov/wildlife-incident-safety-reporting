import { createDatabase } from '@services/database/create-database.js'
import type { DB } from '@services/database/types/database.js'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'

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
    database: 'wisr_test',
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

export async function cleanupTestDatabase(): Promise<void> {
  if (globalThis.__testDb) {
    await globalThis.__testDb.destroy()
    globalThis.__testDb = null
  }
}
