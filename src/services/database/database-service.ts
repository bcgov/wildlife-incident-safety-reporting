import type {
  DensityQuery,
  DensityResponse,
} from '@schemas/incidents/density.schema.js'
import type { IncidentFiltersResponse } from '@schemas/incidents/filters.schema.js'
import type {
  Incident,
  IncidentsQuery,
} from '@schemas/incidents/incidents.schema.js'
import type { BoundariesResponse } from '@schemas/service-areas/boundaries.schema.js'
import type { LookupResponse } from '@schemas/service-areas/lookup.schema.js'
import { withConnectionRetry } from '@utils/db-retry.js'
import { createServiceLogger } from '@utils/logger.js'
import type { FastifyBaseLogger } from 'fastify'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { asGeoJSON, contains, makePoint, setSRID } from 'kysely-postgis'
import { applyFilters, type ResolvedRouteLine } from './filters.js'
import { toIncident } from './mappers/incidents.js'
import type { DB } from './types/database.js'
import type { HmcrIncomingRow, HmcrUpsertRow } from './types/hmcr.js'
import type { LkiBeforeRow, LkiChangedRow, LkiUpsertRow } from './types/lki.js'

export class DatabaseService {
  private readonly log: FastifyBaseLogger

  constructor(
    private readonly kysely: Kysely<DB>,
    baseLog: FastifyBaseLogger,
  ) {
    this.log = createServiceLogger(baseLog, 'DATABASE')
  }

  async healthCheck(): Promise<void> {
    await this.kysely.selectNoFrom(sql.lit(1).as('ok')).execute()
    this.log.debug('health check passed')
  }

  async destroy() {
    this.log.debug('closing connection pool')
    await this.kysely.destroy()
  }

  async findIncidents(
    filters: IncidentsQuery & ResolvedRouteLine,
  ): Promise<{ data: Incident[]; total: number }> {
    this.log.debug({ filters }, 'querying incidents')

    const baseQuery = this.kysely
      .selectFrom('incidents as wi')
      .innerJoin('species as sp', 'sp.id', 'wi.species_id')
      .leftJoin('service_areas as sa', 'sa.id', 'wi.service_area_id')
      .where((eb) => applyFilters(eb, filters))

    const dataQuery = baseQuery.select([
      'wi.id',
      'wi.year',
      'wi.accident_date',
      'wi.species_id',
      'sp.name as species_name',
      'sp.color as species_color',
      'sp.group_name as species_group_name',
      'wi.service_area_id',
      'sa.name as service_area_name',
      'sa.contract_area_number',
      'sa.district',
      'sa.region',
      'wi.sex',
      'wi.time_of_kill',
      'wi.age',
      'wi.quantity',
      'wi.latitude',
      'wi.longitude',
      'wi.nearest_town',
      'wi.comments',
    ])

    if (filters.limit) {
      const paginatedQuery = dataQuery
        .orderBy('wi.accident_date', 'desc')
        .limit(filters.limit)
        .offset(filters.offset)

      const countQuery = baseQuery
        .select((eb) => eb.fn.countAll<string>().as('total'))
        .executeTakeFirstOrThrow()

      const [rows, countResult] = await Promise.all([
        paginatedQuery.execute(),
        countQuery,
      ])

      const total = Number(countResult.total)
      this.log.debug(
        { total, returned: rows.length },
        'incidents query complete (paginated)',
      )

      return {
        data: rows.map(toIncident),
        total,
      }
    }

    const rows = await dataQuery.execute()
    this.log.debug({ total: rows.length }, 'incidents query complete')

    return {
      data: rows.map(toIncident),
      total: rows.length,
    }
  }

  async findServiceAreaBoundaries(): Promise<BoundariesResponse> {
    this.log.debug('querying service area boundaries')

    const rows = await this.kysely
      .selectFrom('service_areas')
      .select((eb) => [
        'id' as const,
        'name' as const,
        'contract_area_number' as const,
        'district' as const,
        'region' as const,
        asGeoJSON(eb, 'geom_simplified').as('geometry'),
      ])
      .where('geom_simplified', 'is not', null)
      .orderBy('name')
      .execute()

    this.log.debug(
      { count: rows.length },
      'service area boundaries query complete',
    )

    return {
      type: 'FeatureCollection',
      features: rows.map((row) => ({
        type: 'Feature' as const,
        geometry: JSON.parse(row.geometry),
        properties: {
          id: row.id,
          name: row.name,
          contractAreaNumber: row.contract_area_number,
          district: row.district,
          region: row.region,
        },
      })),
    }
  }

  async findIncidentFilters(): Promise<IncidentFiltersResponse> {
    this.log.debug('querying incident filters')

    const [
      years,
      species,
      serviceAreas,
      sexValues,
      timeOfKillValues,
      ageValues,
      dateRange,
    ] = await Promise.all([
      this.kysely
        .selectFrom('incidents')
        .select('year')
        .distinct()
        .orderBy('year', 'desc')
        .execute(),
      this.kysely
        .selectFrom('species')
        .select(['id', 'name', 'color', 'group_name'])
        .orderBy('name')
        .execute(),
      this.kysely
        .selectFrom('service_areas')
        .select(['id', 'name', 'contract_area_number', 'district', 'region'])
        .orderBy('name')
        .execute(),
      this.kysely
        .selectFrom('incidents')
        .select('sex')
        .distinct()
        .where('sex', 'is not', null)
        .execute(),
      this.kysely
        .selectFrom('incidents')
        .select('time_of_kill')
        .distinct()
        .where('time_of_kill', 'is not', null)
        .execute(),
      this.kysely
        .selectFrom('incidents')
        .select('age')
        .distinct()
        .where('age', 'is not', null)
        .execute(),
      this.kysely
        .selectFrom('incidents')
        .select([
          sql<string | null>`min(accident_date)::date::text`.as('min'),
          sql<string | null>`max(accident_date)::date::text`.as('max'),
        ])
        .executeTakeFirstOrThrow(),
    ])

    this.log.debug(
      { species: species.length, serviceAreas: serviceAreas.length },
      'incident filters query complete',
    )

    return {
      years: years.map((r) => r.year),
      species: species.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        groupName: r.group_name,
      })),
      serviceAreas: serviceAreas.map((r) => ({
        id: r.id,
        name: r.name,
        contractAreaNumber: r.contract_area_number,
        district: r.district,
        region: r.region,
      })),
      sex: sexValues.flatMap((r) => (r.sex ? [r.sex] : [])).sort(),
      timeOfKill: timeOfKillValues
        .flatMap((r) => (r.time_of_kill ? [r.time_of_kill] : []))
        .sort(),
      age: ageValues.flatMap((r) => (r.age ? [r.age] : [])).sort(),
      dateRange: {
        min: dateRange.min ?? null,
        max: dateRange.max ?? null,
      },
    }
  }

  async findServiceAreaByLocation(
    lng: number,
    lat: number,
  ): Promise<LookupResponse> {
    this.log.debug({ lng, lat }, 'looking up service area by location')

    const row = await this.kysely
      .selectFrom('service_areas')
      .select(['id', 'name', 'contract_area_number', 'district', 'region'])
      .where((eb) =>
        contains(eb, 'geom', setSRID(eb, makePoint(eb, lng, lat), 4326)),
      )
      .executeTakeFirst()

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      contractAreaNumber: row.contract_area_number,
      district: row.district,
      region: row.region,
    }
  }

  async getSpeciesMap(): Promise<Map<string, number>> {
    const rows = await this.kysely
      .selectFrom('species')
      .select(['id', 'name'])
      .execute()
    const map = new Map<string, number>()
    for (const row of rows) {
      map.set(row.name.toLowerCase(), row.id)
    }
    return map
  }

  async upsertHmcrIncidents(
    rows: HmcrUpsertRow[],
  ): Promise<{ created: number; updated: number }> {
    if (rows.length === 0) return { created: 0, updated: 0 }

    this.log.debug({ count: rows.length }, 'upserting HMCR incidents')

    const batchSize = 5000
    const totalBatches = Math.ceil(rows.length / batchSize)

    return await withConnectionRetry(
      () =>
        this.kysely.transaction().execute(async (trx) => {
          let created = 0
          let updated = 0

          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize)
            const batchNum = Math.floor(i / batchSize) + 1

            const incoming =
              sql<HmcrIncomingRow>`jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)`.as<'i'>(
                sql`i(
                  hmcr_record_id int,
                  accident_date date,
                  time_of_kill time_of_kill,
                  nearest_town text,
                  sex sex,
                  age age,
                  comments text,
                  quantity smallint,
                  latitude numeric(9,6),
                  longitude numeric(10,6),
                  species_id smallint,
                  year smallint
                )`,
              )

            // Dropping unchanged rows before the insert keeps the BEFORE INSERT geometry and KNN triggers off them.
            const proposed = trx
              .selectFrom(incoming)
              .leftJoin(
                'incidents as w',
                'w.hmcr_record_id',
                'i.hmcr_record_id',
              )
              .select([
                'i.hmcr_record_id',
                'i.accident_date',
                'i.time_of_kill',
                'i.nearest_town',
                'i.sex',
                'i.age',
                'i.comments',
                'i.quantity',
                'i.latitude',
                'i.longitude',
                'i.species_id',
                'i.year',
              ])
              .where((eb) =>
                eb.or([
                  eb('w.id', 'is', null),
                  eb(
                    'w.accident_date',
                    'is distinct from',
                    eb.ref('i.accident_date'),
                  ),
                  eb(
                    'w.time_of_kill',
                    'is distinct from',
                    eb.ref('i.time_of_kill'),
                  ),
                  eb(
                    'w.nearest_town',
                    'is distinct from',
                    eb.ref('i.nearest_town'),
                  ),
                  eb('w.sex', 'is distinct from', eb.ref('i.sex')),
                  eb('w.age', 'is distinct from', eb.ref('i.age')),
                  eb('w.comments', 'is distinct from', eb.ref('i.comments')),
                  eb('w.quantity', 'is distinct from', eb.ref('i.quantity')),
                  eb('w.latitude', 'is distinct from', eb.ref('i.latitude')),
                  eb('w.longitude', 'is distinct from', eb.ref('i.longitude')),
                  eb(
                    'w.species_id',
                    'is distinct from',
                    eb.ref('i.species_id'),
                  ),
                  eb('w.year', 'is distinct from', eb.ref('i.year')),
                ]),
              )

            // ON CONFLICT still guards duplicates within a batch and concurrent syncs; xmax = 0 marks a true insert.
            const result = await trx
              .insertInto('incidents')
              .columns([
                'hmcr_record_id',
                'accident_date',
                'time_of_kill',
                'nearest_town',
                'sex',
                'age',
                'comments',
                'quantity',
                'latitude',
                'longitude',
                'species_id',
                'year',
              ])
              .expression(proposed)
              .onConflict((oc) =>
                oc.column('hmcr_record_id').doUpdateSet((eb) => ({
                  accident_date: eb.ref('excluded.accident_date'),
                  time_of_kill: eb.ref('excluded.time_of_kill'),
                  nearest_town: eb.ref('excluded.nearest_town'),
                  sex: eb.ref('excluded.sex'),
                  age: eb.ref('excluded.age'),
                  comments: eb.ref('excluded.comments'),
                  quantity: eb.ref('excluded.quantity'),
                  latitude: eb.ref('excluded.latitude'),
                  longitude: eb.ref('excluded.longitude'),
                  species_id: eb.ref('excluded.species_id'),
                  year: eb.ref('excluded.year'),
                })),
              )
              .returning(sql<boolean>`(xmax = 0)`.as('is_new'))
              .execute()

            for (const row of result) {
              if (row.is_new) created++
              else updated++
            }

            if (batchNum % 10 === 0 || batchNum === totalBatches) {
              this.log.debug(
                { batch: batchNum, totalBatches },
                'upsert batch complete',
              )
            }
          }

          this.log.debug({ created, updated }, 'HMCR upsert complete')
          return { created, updated }
        }),
      this.log,
    )
  }

  async upsertLkiSegments(
    rows: LkiUpsertRow[],
  ): Promise<{ upserted: number; deleted: number }> {
    if (rows.length === 0) return { upserted: 0, deleted: 0 }

    this.log.debug({ count: rows.length }, 'upserting LKI segments')

    const batchSize = 100

    return await withConnectionRetry(
      () =>
        this.kysely.transaction().execute(async (transaction) => {
          const trx = transaction.withTables<{
            lki_before: LkiBeforeRow
            lki_changed: LkiChangedRow
          }>()

          // SET LOCAL skips the reassign trigger; DISABLE TRIGGER needs table ownership the app role lacks
          await sql`SET LOCAL wisr.skip_lki_reassign = 'on'`.execute(trx)

          // The changed set is diffed against this snapshot, so it has to be taken before the upsert.
          await trx.schema
            .createTable('lki_before')
            .temporary()
            .onCommit('drop')
            .as(
              trx
                .selectFrom('lki_segments')
                .select(['chris_lki_segment_id', 'geom']),
            )
            .execute()

          let inserted = 0
          let updated = 0

          for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize)

            const result = await trx
              .insertInto('lki_segments')
              .values(
                batch.map((r) => ({
                  chris_lki_segment_id: r.chris_lki_segment_id,
                  lki_segment_name: r.lki_segment_name,
                  lki_segment_description: r.lki_segment_description,
                  lki_segment_direction: r.lki_segment_direction,
                  lki_segment_length: r.lki_segment_length
                    ? String(r.lki_segment_length)
                    : null,
                  lki_route_id: r.lki_route_id,
                  highway_number: r.highway_number,
                  geom: sql`ST_GeomFromGeoJSON(${r.geom})`,
                  feature_length_m: r.feature_length_m
                    ? String(r.feature_length_m)
                    : null,
                  objectid: r.objectid,
                })),
              )
              .onConflict((oc) =>
                oc
                  .column('chris_lki_segment_id')
                  .doUpdateSet((eb) => ({
                    lki_segment_name: eb.ref('excluded.lki_segment_name'),
                    lki_segment_description: eb.ref(
                      'excluded.lki_segment_description',
                    ),
                    lki_segment_direction: eb.ref(
                      'excluded.lki_segment_direction',
                    ),
                    lki_segment_length: eb.ref('excluded.lki_segment_length'),
                    lki_route_id: eb.ref('excluded.lki_route_id'),
                    highway_number: eb.ref('excluded.highway_number'),
                    geom: eb.ref('excluded.geom'),
                    feature_length_m: eb.ref('excluded.feature_length_m'),
                    objectid: eb.ref('excluded.objectid'),
                  }))
                  .where((eb) =>
                    eb.or([
                      eb(
                        'lki_segments.lki_segment_name',
                        'is distinct from',
                        eb.ref('excluded.lki_segment_name'),
                      ),
                      eb(
                        'lki_segments.lki_segment_description',
                        'is distinct from',
                        eb.ref('excluded.lki_segment_description'),
                      ),
                      eb(
                        'lki_segments.lki_segment_direction',
                        'is distinct from',
                        eb.ref('excluded.lki_segment_direction'),
                      ),
                      eb(
                        'lki_segments.lki_segment_length',
                        'is distinct from',
                        eb.ref('excluded.lki_segment_length'),
                      ),
                      eb(
                        'lki_segments.lki_route_id',
                        'is distinct from',
                        eb.ref('excluded.lki_route_id'),
                      ),
                      eb(
                        'lki_segments.highway_number',
                        'is distinct from',
                        eb.ref('excluded.highway_number'),
                      ),
                      eb(
                        'lki_segments.geom',
                        'is distinct from',
                        eb.ref('excluded.geom'),
                      ),
                      eb(
                        'lki_segments.feature_length_m',
                        'is distinct from',
                        eb.ref('excluded.feature_length_m'),
                      ),
                      eb(
                        'lki_segments.objectid',
                        'is distinct from',
                        eb.ref('excluded.objectid'),
                      ),
                    ]),
                  ),
              )
              .returning(sql<boolean>`(xmax = 0)`.as('is_insert'))
              .execute()

            const batchInserted = result.filter((r) => r.is_insert).length
            inserted += batchInserted
            updated += result.length - batchInserted
          }

          const incomingIds = JSON.stringify(
            rows.map((r) => r.chris_lki_segment_id),
          )
          const deleteResult = await trx
            .deleteFrom('lki_segments')
            .where('chris_lki_segment_id', 'not in', (eb) =>
              eb
                .selectFrom(
                  sql`jsonb_array_elements_text(${incomingIds}::jsonb)`.as('e'),
                )
                .select(sql<number>`value::int`.as('id')),
            )
            .execute()

          const deleted = Number(deleteResult[0].numDeletedRows)
          const upserted = inserted + updated

          await trx.schema
            .createTable('lki_changed')
            .temporary()
            .onCommit('drop')
            .as(
              trx
                .selectFrom('lki_before as b')
                .leftJoin(
                  'lki_segments as s',
                  's.chris_lki_segment_id',
                  'b.chris_lki_segment_id',
                )
                .select('b.geom')
                .where((eb) =>
                  eb.or([
                    eb('s.chris_lki_segment_id', 'is', null),
                    eb('s.geom', 'is distinct from', eb.ref('b.geom')),
                  ]),
                )
                .unionAll(
                  trx
                    .selectFrom('lki_segments as s')
                    .leftJoin(
                      'lki_before as b',
                      'b.chris_lki_segment_id',
                      's.chris_lki_segment_id',
                    )
                    .select('s.geom')
                    .where((eb) =>
                      eb.or([
                        eb('b.chris_lki_segment_id', 'is', null),
                        eb('b.geom', 'is distinct from', eb.ref('s.geom')),
                      ]),
                    ),
                ),
            )
            .execute()

          const changedResult = await trx
            .selectFrom('lki_changed')
            .select((eb) =>
              eb.cast<number>(eb.fn.countAll(), 'integer').as('count'),
            )
            .executeTakeFirstOrThrow()
          const changedSegments = changedResult.count

          // An assignment can only move if a segment inside the incident's 200 m radius appeared, moved, or vanished.
          if (changedSegments > 0) {
            this.log.debug(
              { changedSegments },
              'reassigning incidents to LKI segments',
            )
            // MATERIALIZED fences the candidate set below the LATERAL, otherwise the planner runs the KNN for every incident.
            await trx
              .with(
                (cte) => cte('candidates').materialized(),
                (db) =>
                  db
                    .selectFrom('incidents as wi2')
                    .select(['wi2.id', 'wi2.geom'])
                    .where('wi2.geom', 'is not', null)
                    .where((eb) =>
                      eb.exists(
                        eb
                          .selectFrom('lki_changed as c')
                          .select(sql.lit(1).as('one'))
                          .where(
                            sql<boolean>`ST_DWithin(geography(wi2.geom), geography(c.geom), 200)`,
                          ),
                      ),
                    ),
              )
              .updateTable('incidents as wi')
              .from((eb) =>
                eb
                  .selectFrom('candidates as cd')
                  .crossJoinLateral((lateral) =>
                    lateral
                      .selectFrom('lki_segments')
                      .select(['chris_lki_segment_id', 'geom'])
                      .orderBy(sql`geom <-> cd.geom`)
                      .limit(1)
                      .as('nearest'),
                  )
                  .select([
                    'cd.id',
                    'nearest.chris_lki_segment_id as nearest_id',
                  ])
                  .where(
                    sql<boolean>`ST_DWithin(geography(nearest.geom), geography(cd.geom), 200)`,
                  )
                  .as('sub'),
              )
              .set((eb) => ({ lki_segment_id: eb.ref('sub.nearest_id') }))
              .whereRef('wi.id', '=', 'sub.id')
              .whereRef(
                'wi.lki_segment_id',
                'is distinct from',
                'sub.nearest_id',
              )
              .execute()

            await trx
              .updateTable('incidents')
              .set({ lki_segment_id: null })
              .where('geom', 'is not', null)
              .where('lki_segment_id', 'is not', null)
              .where((eb) =>
                eb.exists(
                  eb
                    .selectFrom('lki_changed as c')
                    .select(sql.lit(1).as('one'))
                    .where(
                      sql<boolean>`ST_DWithin(geography(incidents.geom), geography(c.geom), 200)`,
                    ),
                ),
              )
              .where((eb) =>
                eb.not(
                  eb.exists(
                    eb
                      .selectFrom('lki_segments as s')
                      .select(sql.lit(1).as('one'))
                      .where(
                        sql<boolean>`ST_DWithin(geography(s.geom), geography(incidents.geom), 200)`,
                      ),
                  ),
                ),
              )
              .execute()
          }

          this.log.debug({ upserted, deleted }, 'LKI upsert complete')
          return { upserted, deleted }
        }),
      this.log,
    )
  }

  async findLkiDensity(
    filters: DensityQuery & ResolvedRouteLine,
  ): Promise<DensityResponse> {
    this.log.debug({ filters }, 'querying LKI segment density')

    const rows = await this.kysely
      .with('filtered', (db) =>
        db
          .selectFrom('incidents as wi')
          .innerJoin('species as sp', 'sp.id', 'wi.species_id')
          .select(['wi.lki_segment_id', 'wi.quantity', 'sp.body_size'])
          .where('wi.lki_segment_id', 'is not', null)
          .where((eb) => applyFilters(eb, filters)),
      )
      .selectFrom('lki_segments as ls')
      .leftJoin('filtered as f', 'f.lki_segment_id', 'ls.chris_lki_segment_id')
      .select((eb) => [
        'ls.chris_lki_segment_id as segment_id' as const,
        'ls.lki_segment_name as segment_name' as const,
        'ls.lki_segment_description as segment_description' as const,
        'ls.highway_number' as const,
        'ls.lki_segment_length as segment_length_km' as const,
        asGeoJSON(eb, 'ls.geom').as('geometry'),
        sql<number>`coalesce(sum(f.quantity) filter (where f.body_size = 'SMALL'), 0)`.as(
          'small',
        ),
        sql<number>`coalesce(sum(f.quantity) filter (where f.body_size = 'MEDIUM'), 0)`.as(
          'medium',
        ),
        sql<number>`coalesce(sum(f.quantity) filter (where f.body_size = 'LARGE'), 0)`.as(
          'large',
        ),
        sql<number>`coalesce(sum(f.quantity), 0)`.as('total_animals'),
        sql<number>`
          coalesce(sum(f.quantity) filter (where f.body_size = 'SMALL'), 0) * 1
          + coalesce(sum(f.quantity) filter (where f.body_size = 'MEDIUM'), 0) * 4
          + coalesce(sum(f.quantity) filter (where f.body_size = 'LARGE'), 0) * 20
        `.as('weighted'),
        sql<number | null>`case when ls.lki_segment_length > 0 then
          round((
            coalesce(sum(f.quantity) filter (where f.body_size = 'SMALL'), 0) * 1
            + coalesce(sum(f.quantity) filter (where f.body_size = 'MEDIUM'), 0) * 4
            + coalesce(sum(f.quantity) filter (where f.body_size = 'LARGE'), 0) * 20
          )::numeric / ls.lki_segment_length, 2)
        end`.as('density_per_km'),
      ])
      .groupBy([
        'ls.chris_lki_segment_id',
        'ls.lki_segment_name',
        'ls.lki_segment_description',
        'ls.highway_number',
        'ls.lki_segment_length',
        'ls.geom',
      ])
      .execute()

    this.log.debug({ count: rows.length }, 'LKI density query complete')

    return rows.map((r) => ({
      segmentId: r.segment_id,
      segmentName: r.segment_name,
      segmentDescription: r.segment_description,
      highwayNumber: r.highway_number,
      segmentLengthKm: r.segment_length_km ? Number(r.segment_length_km) : null,
      geometry: JSON.parse(r.geometry),
      small: Number(r.small),
      medium: Number(r.medium),
      large: Number(r.large),
      totalAnimals: Number(r.total_animals),
      weighted: Number(r.weighted),
      densityPerKm: r.density_per_km != null ? Number(r.density_per_km) : null,
    }))
  }

  async readCacheGeneration(): Promise<number> {
    const row = await this.kysely
      .selectFrom('cache_generation')
      .select('version')
      .where('id', '=', 1)
      .executeTakeFirstOrThrow()
    return row.version
  }

  async bumpCacheGeneration(): Promise<void> {
    await this.kysely
      .updateTable('cache_generation')
      .set({ version: sql<number>`version + 1` })
      .where('id', '=', 1)
      .execute()
  }
}
