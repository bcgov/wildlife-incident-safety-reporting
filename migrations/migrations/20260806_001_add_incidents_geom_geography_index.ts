import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<never>): Promise<void> {
  // The gist(geom) index cannot serve the geography cast corridor filtering uses
  await sql`
    CREATE INDEX idx_incidents_geom_geog
    ON incidents USING gist (geography(geom))
  `.execute(db)
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_incidents_geom_geog`.execute(db)
}
