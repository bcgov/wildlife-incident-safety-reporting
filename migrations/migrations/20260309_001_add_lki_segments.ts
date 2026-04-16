import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<never>): Promise<void> {
  // Body size enum for species-based density weighting
  await db.schema
    .createType('body_size')
    .asEnum(['LARGE', 'MEDIUM', 'SMALL'])
    .execute()

  await db.schema
    .alterTable('species')
    .addColumn('body_size', sql`body_size`, (col) =>
      col.notNull().defaultTo(sql`'SMALL'::body_size`),
    )
    .execute()

  await sql`
    UPDATE species SET body_size = 'LARGE' WHERE name IN (
      'Moose', 'Elk', 'Caribou', 'Buffalo'
    )
  `.execute(db)

  await sql`
    UPDATE species SET body_size = 'MEDIUM' WHERE name IN (
      'Deer', 'Mule Deer', 'White Tail Deer',
      'Bear', 'Black Bear', 'Grizzly Bear',
      'Cougar', 'Sheep', 'Wolf'
    )
  `.execute(db)

  await db.schema
    .createTable('lki_segments')
    .addColumn('chris_lki_segment_id', 'integer', (col) => col.primaryKey())
    .addColumn('lki_segment_name', 'text', (col) => col.notNull())
    .addColumn('lki_segment_description', 'text')
    .addColumn('lki_segment_direction', 'text')
    .addColumn('lki_segment_length', sql`numeric(18,4)`)
    .addColumn('lki_route_id', sql`varchar(4)`)
    .addColumn('highway_number', 'text')
    .addColumn('geom', sql`geometry(Geometry, 4326)`, (col) => col.notNull())
    .addColumn('feature_length_m', sql`numeric(19,4)`)
    .addColumn('objectid', 'integer')
    .addColumn('created_at', sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()

  await db.schema
    .createIndex('idx_lki_segments_geom')
    .on('lki_segments')
    .using('gist')
    .column('geom')
    .execute()

  // Functional index for geography-based distance queries (ST_DWithin, <->)
  await sql`
    CREATE INDEX idx_lki_segments_geom_geog
    ON lki_segments USING gist (geography(geom))
  `.execute(db)

  await db.schema
    .createIndex('idx_lki_segments_route_id')
    .on('lki_segments')
    .column('lki_route_id')
    .execute()

  await sql`
    CREATE TRIGGER trg_lki_segments_updated_at
    BEFORE UPDATE ON lki_segments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at()
  `.execute(db)

  await db.schema
    .alterTable('incidents')
    .addColumn('lki_segment_id', 'integer', (col) =>
      col.references('lki_segments.chris_lki_segment_id').onDelete('set null'),
    )
    .execute()

  await db.schema
    .createIndex('idx_incidents_lki_segment_id')
    .on('incidents')
    .column('lki_segment_id')
    .execute()

  // Functional index for geography-based distance queries against incidents
  await sql`
    CREATE INDEX idx_incidents_geom_geog
    ON incidents USING gist (geography(geom))
  `.execute(db)

  // Assign nearest LKI segment within 200m on incident insert/update.
  // This trigger fires after trg_incidents_geom (alphabetical ordering)
  // which has already computed geom from lat/lng.
  // Uses <-> KNN operator (GiST-accelerated) to find nearest, then confirms
  // with a single ST_DWithin geography check on that one candidate.
  await sql`
    CREATE OR REPLACE FUNCTION assign_nearest_lki_segment()
    RETURNS trigger AS $$
    DECLARE
      candidate_id integer;
      candidate_geom geometry;
    BEGIN
      IF NEW.geom IS NOT NULL THEN
        SELECT chris_lki_segment_id, geom
        INTO candidate_id, candidate_geom
        FROM lki_segments
        ORDER BY geom <-> NEW.geom
        LIMIT 1;

        IF candidate_id IS NOT NULL
          AND ST_DWithin(geography(candidate_geom), geography(NEW.geom), 200)
        THEN
          NEW.lki_segment_id := candidate_id;
        ELSE
          NEW.lki_segment_id := NULL;
        END IF;
      ELSE
        NEW.lki_segment_id := NULL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db)

  await sql`
    CREATE TRIGGER trg_incidents_lki_assign
    BEFORE INSERT OR UPDATE OF latitude, longitude ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION assign_nearest_lki_segment()
  `.execute(db)

  // Bulk reassign all incidents when LKI segments change.
  // Uses LATERAL + <-> KNN (GiST-accelerated) to find the nearest segment
  // per incident, then confirms with a single geography distance check.
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

  await sql`
    CREATE TRIGGER trg_reassign_incidents_on_lki_change
    AFTER INSERT OR UPDATE OR DELETE ON lki_segments
    FOR EACH STATEMENT
    EXECUTE FUNCTION reassign_incidents_lki_segment()
  `.execute(db)
}

export async function down(db: Kysely<never>): Promise<void> {
  await sql`DROP TRIGGER IF EXISTS trg_reassign_incidents_on_lki_change ON lki_segments`.execute(
    db,
  )
  await sql`DROP FUNCTION IF EXISTS reassign_incidents_lki_segment() CASCADE`.execute(
    db,
  )
  await sql`DROP TRIGGER IF EXISTS trg_incidents_lki_assign ON incidents`.execute(
    db,
  )
  await sql`DROP FUNCTION IF EXISTS assign_nearest_lki_segment() CASCADE`.execute(
    db,
  )
  await db.schema.dropIndex('idx_incidents_geom_geog').execute()
  await db.schema.alterTable('incidents').dropColumn('lki_segment_id').execute()
  await db.schema.dropTable('lki_segments').cascade().execute()
  await db.schema.alterTable('species').dropColumn('body_size').execute()
  await db.schema.dropType('body_size').ifExists().execute()
}
