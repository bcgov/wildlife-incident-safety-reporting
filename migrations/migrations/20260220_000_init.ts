import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<never>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS postgis`.execute(db)

  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db)
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`DROP FUNCTION IF EXISTS update_updated_at() CASCADE`.execute(db)
  await sql`DROP EXTENSION IF EXISTS postgis CASCADE`.execute(db)
}
