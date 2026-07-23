import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<never>): Promise<void> {
  await db.schema
    .createTable('cache_generation')
    .addColumn('id', 'smallint', (col) => col.primaryKey().check(sql`id = 1`))
    .addColumn('version', 'integer', (col) => col.notNull().defaultTo(0))
    .execute()

  await sql`INSERT INTO cache_generation (id, version) VALUES (1, 0)`.execute(
    db,
  )
}

export async function down(db: Kysely<never>): Promise<void> {
  await db.schema.dropTable('cache_generation').execute()
}
