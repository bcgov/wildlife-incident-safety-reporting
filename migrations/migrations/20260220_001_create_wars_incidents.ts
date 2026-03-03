import type { Kysely } from 'kysely'
import { sql } from 'kysely'

export async function up(db: Kysely<never>): Promise<void> {
  // Species reference table
  await db.schema
    .createTable('species')
    .addColumn('id', 'smallint', (col) =>
      col.primaryKey().generatedAlwaysAsIdentity(),
    )
    .addColumn('name', 'text', (col) => col.notNull().unique())
    .addColumn('group_name', 'text', (col) => col.notNull())
    .addColumn('color', sql`char(7)`, (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('idx_species_group_name')
    .on('species')
    .column('group_name')
    .execute()

  // Seed species
  await sql`
    INSERT INTO species (name, group_name, color) VALUES
      ('Badger',          'Badger',          '#C1E3D8'),
      ('Bear',            'Bear',            '#F3923F'),
      ('Beaver',          'Beaver',          '#FCCF31'),
      ('Black Bear',      'Bear',            '#F3923F'),
      ('Bobcat',          'Bobcat',          '#EE5C30'),
      ('Buffalo',         'Buffalo',         '#7F2F8B'),
      ('Caribou',         'Caribou',         '#C59FC8'),
      ('Cougar',          'Cougar',          '#FEE3C0'),
      ('Coyote',          'Coyote',          '#927E7A'),
      ('Deer',            'Deer',            '#BAA7A2'),
      ('Eagle',           'Eagle',           '#DCDDDE'),
      ('Elk',             'Elk',             '#D3CB8D'),
      ('Fox',             'Fox',             '#32A7DC'),
      ('Grizzly Bear',    'Bear',            '#AD2147'),
      ('Horned Owl',      'Horned Owl',      '#F5C2D7'),
      ('Lynx',            'Lynx',            '#91632D'),
      ('Marten',          'Marten',          '#808083'),
      ('Moose',           'Moose',           '#8AC04B'),
      ('Mule Deer',       'Deer',            '#CBBDB9'),
      ('Muskrat',         'Muskrat',         '#A3C497'),
      ('Otter',           'Otter',           '#0C6F47'),
      ('Porcupine',       'Porcupine',       '#4C5FA7'),
      ('Possum',          'Possum',          '#A3B5DB'),
      ('Rabbit',          'Rabbit',          '#EA212E'),
      ('Raccoon',         'Raccoon',         '#BE953B'),
      ('Sheep',           'Sheep',           '#008D82'),
      ('Skunk',           'Skunk',           '#E6E7E8'),
      ('Unknown',         'Unknown',         '#323232'),
      ('White Tail Deer', 'Deer',            '#E0D8D6'),
      ('Wolf',            'Wolf',            '#8A5A7C')
  `.execute(db)

  // Service areas reference table
  await db.schema
    .createTable('service_areas')
    .addColumn('id', 'smallint', (col) =>
      col.primaryKey().generatedAlwaysAsIdentity(),
    )
    .addColumn('contract_area_number', 'smallint', (col) =>
      col.notNull().unique(),
    )
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('district', 'text', (col) => col.notNull())
    .addColumn('region', 'text', (col) => col.notNull())
    .addColumn('geom', sql`geometry(MultiPolygon, 4326)`, (col) =>
      col.notNull(),
    )
    .addColumn('geom_simplified', sql`geometry(MultiPolygon, 4326)`)
    .addColumn('created_at', sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()

  await db.schema
    .createIndex('idx_service_areas_geom')
    .on('service_areas')
    .using('gist')
    .column('geom')
    .execute()

  await sql`
    CREATE TRIGGER trg_service_areas_updated_at
    BEFORE UPDATE ON service_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at()
  `.execute(db)

  // Recompute simplified geometries for all service areas as a coverage.
  // Uses ST_CoverageSimplify in BC Albers (EPSG:3005, meters) with 500m tolerance,
  // which preserves shared boundaries between adjacent service areas.
  await sql`
    CREATE OR REPLACE FUNCTION recompute_simplified_geom()
    RETURNS trigger AS $$
    BEGIN
      UPDATE service_areas sa
      SET geom_simplified = sub.geom_simplified
      FROM (
        SELECT id, ST_Transform(
          ST_SetSRID(ST_CoverageSimplify(ST_Transform(geom, 3005), 500) OVER (), 3005),
          4326
        ) AS geom_simplified
        FROM service_areas
      ) sub
      WHERE sa.id = sub.id;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db)

  await sql`
    CREATE TRIGGER trg_simplify_service_areas
    AFTER INSERT OR UPDATE OF geom OR DELETE ON service_areas
    FOR EACH STATEMENT
    EXECUTE FUNCTION recompute_simplified_geom()
  `.execute(db)

  // Reassign all incidents to the correct service area when boundaries change
  await sql`
    CREATE OR REPLACE FUNCTION reassign_incidents_service_area()
    RETURNS trigger AS $$
    BEGIN
      UPDATE wars_incidents wi
      SET service_area_id = sa.id
      FROM service_areas sa
      WHERE ST_Contains(sa.geom, wi.geom)
        AND wi.service_area_id IS DISTINCT FROM sa.id;

      UPDATE wars_incidents
      SET service_area_id = NULL
      WHERE geom IS NOT NULL
        AND service_area_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM service_areas sa
          WHERE ST_Contains(sa.geom, wars_incidents.geom)
        );

      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db)

  await sql`
    CREATE TRIGGER trg_reassign_incidents_on_boundary_change
    AFTER INSERT OR UPDATE OF geom OR DELETE ON service_areas
    FOR EACH STATEMENT
    EXECUTE FUNCTION reassign_incidents_service_area()
  `.execute(db)

  // Enums
  await db.schema
    .createType('time_of_kill')
    .asEnum(['DAWN', 'DUSK', 'DAY', 'DARK', 'UNKNOWN'])
    .execute()

  await db.schema
    .createType('sex')
    .asEnum(['MALE', 'FEMALE', 'UNKNOWN'])
    .execute()

  await db.schema
    .createType('age')
    .asEnum(['YOUNG', 'ADULT', 'UNKNOWN'])
    .execute()

  // Wars incidents table
  await db.schema
    .createTable('wars_incidents')
    .addColumn('id', 'integer', (col) =>
      col.primaryKey().generatedAlwaysAsIdentity(),
    )
    .addColumn('latitude', sql`numeric(9,6)`)
    .addColumn('longitude', sql`numeric(10,6)`)
    .addColumn('geom', sql`geometry(Point, 4326)`)
    .addColumn('year', 'smallint', (col) => col.notNull())
    .addColumn('accident_date', 'date')
    .addColumn('time_of_kill', sql`time_of_kill`)
    .addColumn('nearest_town', 'text')
    .addColumn('sex', sql`sex`)
    .addColumn('age', sql`age`)
    .addColumn('comments', 'text')
    .addColumn('quantity', 'smallint', (col) => col.notNull().defaultTo(1))
    .addColumn('species_id', 'smallint', (col) =>
      col.notNull().references('species.id'),
    )
    .addColumn('service_area_id', 'smallint', (col) =>
      col.references('service_areas.id'),
    )
    .addColumn('created_at', sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', sql`timestamptz`, (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()

  // Auto-compute geom from lat/lng, then assign service area via spatial containment
  await sql`
    CREATE OR REPLACE FUNCTION wars_incidents_geom_trigger()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
        NEW.service_area_id := (
          SELECT id FROM service_areas
          WHERE ST_Contains(geom, NEW.geom)
          LIMIT 1
        );
      ELSE
        NEW.geom := NULL;
        NEW.service_area_id := NULL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `.execute(db)

  await sql`
    CREATE TRIGGER trg_wars_incidents_geom
    BEFORE INSERT OR UPDATE OF latitude, longitude ON wars_incidents
    FOR EACH ROW
    EXECUTE FUNCTION wars_incidents_geom_trigger()
  `.execute(db)

  // Auto-update updated_at on row modification
  await sql`
    CREATE TRIGGER trg_wars_incidents_updated_at
    BEFORE UPDATE ON wars_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at()
  `.execute(db)

  // Indexes
  await db.schema
    .createIndex('idx_wars_incidents_geom')
    .on('wars_incidents')
    .using('gist')
    .column('geom')
    .execute()

  await db.schema
    .createIndex('idx_wars_incidents_year')
    .on('wars_incidents')
    .column('year')
    .execute()

  await db.schema
    .createIndex('idx_wars_incidents_species_id')
    .on('wars_incidents')
    .column('species_id')
    .execute()

  await db.schema
    .createIndex('idx_wars_incidents_service_area_id')
    .on('wars_incidents')
    .column('service_area_id')
    .execute()

  await db.schema
    .createIndex('idx_wars_incidents_year_species')
    .on('wars_incidents')
    .columns(['year', 'species_id'])
    .execute()
}

export async function down(db: Kysely<never>): Promise<void> {
  await db.schema.dropTable('wars_incidents').cascade().execute()
  await db.schema.dropTable('service_areas').cascade().execute()
  await db.schema.dropTable('species').cascade().execute()
  await sql`DROP FUNCTION IF EXISTS wars_incidents_geom_trigger() CASCADE`.execute(
    db,
  )
  await sql`DROP FUNCTION IF EXISTS recompute_simplified_geom() CASCADE`.execute(
    db,
  )
  await sql`DROP FUNCTION IF EXISTS reassign_incidents_service_area() CASCADE`.execute(
    db,
  )
  await db.schema.dropType('time_of_kill').ifExists().execute()
  await db.schema.dropType('sex').ifExists().execute()
  await db.schema.dropType('age').ifExists().execute()
}
