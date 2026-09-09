import type { Kysely } from 'kysely'

export async function up(db: Kysely<never>): Promise<void> {
  await db.schema.dropIndex('idx_incidents_species_id').ifExists().execute()
  await db.schema.dropIndex('idx_species_group_name').ifExists().execute()
  await db.schema.dropIndex('idx_lki_segments_route_id').ifExists().execute()
}

export async function down(db: Kysely<never>): Promise<void> {
  await db.schema
    .createIndex('idx_incidents_species_id')
    .on('incidents')
    .column('species_id')
    .execute()

  await db.schema
    .createIndex('idx_species_group_name')
    .on('species')
    .column('group_name')
    .execute()

  await db.schema
    .createIndex('idx_lki_segments_route_id')
    .on('lki_segments')
    .column('lki_route_id')
    .execute()
}
