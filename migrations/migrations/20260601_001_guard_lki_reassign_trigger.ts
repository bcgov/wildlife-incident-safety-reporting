import type { Kysely } from 'kysely'
import { sql } from 'kysely'

// Guard lets the bulk sync skip reassignment via a SET LOCAL GUC instead of
// DISABLE TRIGGER, which the least-privilege app role lacks ownership to run.
export async function up(db: Kysely<never>): Promise<void> {
  await sql`
    CREATE OR REPLACE FUNCTION reassign_incidents_lki_segment()
    RETURNS trigger AS $$
    BEGIN
      IF current_setting('wisr.skip_lki_reassign', true) = 'on' THEN
        RETURN NULL;
      END IF;

      UPDATE incidents wi
      SET lki_segment_id = sub.nearest_id
      FROM (
        SELECT wi2.id, nearest.chris_lki_segment_id AS nearest_id
        FROM incidents wi2
        CROSS JOIN LATERAL (
          SELECT chris_lki_segment_id, geom
          FROM lki_segments
          ORDER BY geom <-> wi2.geom
          LIMIT 1
        ) nearest
        WHERE wi2.geom IS NOT NULL
          AND ST_DWithin(geography(nearest.geom), geography(wi2.geom), 200)
      ) sub
      WHERE wi.id = sub.id
        AND wi.lki_segment_id IS DISTINCT FROM sub.nearest_id;

      UPDATE incidents
      SET lki_segment_id = NULL
      WHERE geom IS NOT NULL
        AND lki_segment_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM lki_segments s
          WHERE ST_DWithin(geography(s.geom), geography(incidents.geom), 200)
        );

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db)
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`
    CREATE OR REPLACE FUNCTION reassign_incidents_lki_segment()
    RETURNS trigger AS $$
    BEGIN
      UPDATE incidents wi
      SET lki_segment_id = sub.nearest_id
      FROM (
        SELECT wi2.id, nearest.chris_lki_segment_id AS nearest_id
        FROM incidents wi2
        CROSS JOIN LATERAL (
          SELECT chris_lki_segment_id, geom
          FROM lki_segments
          ORDER BY geom <-> wi2.geom
          LIMIT 1
        ) nearest
        WHERE wi2.geom IS NOT NULL
          AND ST_DWithin(geography(nearest.geom), geography(wi2.geom), 200)
      ) sub
      WHERE wi.id = sub.id
        AND wi.lki_segment_id IS DISTINCT FROM sub.nearest_id;

      UPDATE incidents
      SET lki_segment_id = NULL
      WHERE geom IS NOT NULL
        AND lki_segment_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM lki_segments s
          WHERE ST_DWithin(geography(s.geom), geography(incidents.geom), 200)
        );

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db)
}
