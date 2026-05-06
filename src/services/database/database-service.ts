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
import { createServiceLogger } from '@utils/logger.js'
import type { FastifyBaseLogger } from 'fastify'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { asGeoJSON, contains, makePoint, setSRID } from 'kysely-postgis'
import { applyFilters } from './filters.js'
import { toIncident } from './mappers/incidents.js'
import type { Age, DB, Sex, TimeOfKill } from './types/database.js'
import type { HmcrUpsertRow } from './types/hmcr.js'
import type { LkiUpsertRow } from './types/lki.js'

export class DatabaseService {
  private readonly log: FastifyBaseLogger

  constructor(
    private readonly kysely: Kysely<DB>,
    baseLog: FastifyBaseLogger,
  ) {
    this.log = createServiceLogger(baseLog, 'DATABASE')
  }

  async healthCheck(): Promise<void> {
    await sql`SELECT 1`.execute(this.kysely)
    this.log.debug('health check passed')
  }

  async destroy() {
    this.log.debug('closing connection pool')
    await this.kysely.destroy()
  }

  async findIncidents(
    filters: IncidentsQuery,
  ): Promise<{ data: Incident[]; total: number }> {
    this.log.debug({ filters }, 'querying incidents')

    const baseQuery = this.kysely
      .selectFrom('incidents as wi')
      .innerJoin('species as sp', 'sp.id', 'wi.species_id')
      .leftJoin('service_areas as sa', 'sa.id', 'wi.service_area_id')
      .where((eb) => applyFilters(eb, filters))

    const dataQuery = baseQuery
      .select([
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
      .orderBy('wi.accident_date', 'desc')

    if (filters.limit) {
      const paginatedQuery = dataQuery
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

    const batchSize = 1000
    const totalBatches = Math.ceil(rows.length / batchSize)

    return await this.kysely.transaction().execute(async (trx) => {
      let created = 0
      let updated = 0

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        const batchNum = Math.floor(i / batchSize) + 1

        // Use xmax to distinguish inserts (xmax = 0) from updates (xmax > 0).
        // IS DISTINCT FROM and xmax aren't expressible via the query builder.
        const result = await trx
          .insertInto('incidents')
          .values(
            batch.map((r) => ({
              hmcr_record_id: r.hmcr_record_id,
              accident_date: r.accident_date
                ? sql<Date>`${r.accident_date}::date`
                : null,
              time_of_kill: r.time_of_kill
                ? sql<TimeOfKill>`${r.time_of_kill}::time_of_kill`
                : null,
              nearest_town: r.nearest_town,
              sex: r.sex ? sql<Sex>`${r.sex}::sex` : null,
              age: r.age ? sql<Age>`${r.age}::age` : null,
              comments: r.comments,
              quantity: r.quantity,
              latitude: r.latitude,
              longitude: r.longitude,
              species_id: r.species_id,
              year: r.year,
            })),
          )
          .onConflict((oc) =>
            oc
              .column('hmcr_record_id')
              .doUpdateSet((eb) => ({
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
              }))
              .where(
                sql<boolean>`
                  incidents.accident_date IS DISTINCT FROM excluded.accident_date
                  OR incidents.time_of_kill IS DISTINCT FROM excluded.time_of_kill
                  OR incidents.nearest_town IS DISTINCT FROM excluded.nearest_town
                  OR incidents.sex IS DISTINCT FROM excluded.sex
                  OR incidents.age IS DISTINCT FROM excluded.age
                  OR incidents.comments IS DISTINCT FROM excluded.comments
                  OR incidents.quantity IS DISTINCT FROM excluded.quantity
                  OR incidents.latitude IS DISTINCT FROM excluded.latitude
                  OR incidents.longitude IS DISTINCT FROM excluded.longitude
                  OR incidents.species_id IS DISTINCT FROM excluded.species_id
                  OR incidents.year IS DISTINCT FROM excluded.year
                `,
              ),
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
    })
  }

  async upsertLkiSegments(
    rows: LkiUpsertRow[],
  ): Promise<{ upserted: number; deleted: number }> {
    if (rows.length === 0) return { upserted: 0, deleted: 0 }

    this.log.debug({ count: rows.length }, 'upserting LKI segments')

    return await this.kysely.transaction().execute(async (trx) => {
      // Disable bulk reassignment trigger - run it explicitly only if data changed
      await sql`ALTER TABLE lki_segments DISABLE TRIGGER trg_reassign_incidents_on_lki_change`.execute(
        trx,
      )

      const incomingIds = rows.map((r) => r.chris_lki_segment_id)

      const result = await trx
        .insertInto('lki_segments')
        .values(
          rows.map((r) => ({
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
              lki_segment_direction: eb.ref('excluded.lki_segment_direction'),
              lki_segment_length: eb.ref('excluded.lki_segment_length'),
              lki_route_id: eb.ref('excluded.lki_route_id'),
              highway_number: eb.ref('excluded.highway_number'),
              geom: eb.ref('excluded.geom'),
              feature_length_m: eb.ref('excluded.feature_length_m'),
              objectid: eb.ref('excluded.objectid'),
            }))
            .where(
              sql<boolean>`
                lki_segments.lki_segment_name IS DISTINCT FROM excluded.lki_segment_name
                OR lki_segments.lki_segment_description IS DISTINCT FROM excluded.lki_segment_description
                OR lki_segments.lki_segment_direction IS DISTINCT FROM excluded.lki_segment_direction
                OR lki_segments.lki_segment_length IS DISTINCT FROM excluded.lki_segment_length
                OR lki_segments.lki_route_id IS DISTINCT FROM excluded.lki_route_id
                OR lki_segments.highway_number IS DISTINCT FROM excluded.highway_number
                OR lki_segments.geom IS DISTINCT FROM excluded.geom
                OR lki_segments.feature_length_m IS DISTINCT FROM excluded.feature_length_m
                OR lki_segments.objectid IS DISTINCT FROM excluded.objectid
              `,
            ),
        )
        .returning(sql<boolean>`(xmax = 0)`.as('is_insert'))
        .execute()

      const inserted = result.filter((r) => r.is_insert).length
      const updated = result.length - inserted

      // Delete orphaned segments no longer in the WFS source
      const deleteResult = await trx
        .deleteFrom('lki_segments')
        .where('chris_lki_segment_id', 'not in', incomingIds)
        .execute()

      const deleted = Number(deleteResult[0].numDeletedRows)
      const upserted = inserted + updated

      // Only reassign if segments were added, removed, or had data changes
      if (inserted > 0 || updated > 0 || deleted > 0) {
        this.log.debug('reassigning incidents to LKI segments')
        await sql`
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
            AND wi.lki_segment_id IS DISTINCT FROM sub.nearest_id
        `.execute(trx)

        await sql`
          UPDATE incidents
          SET lki_segment_id = NULL
          WHERE geom IS NOT NULL
            AND lki_segment_id IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM lki_segments s
              WHERE ST_DWithin(geography(s.geom), geography(incidents.geom), 200)
            )
        `.execute(trx)
      }

      await sql`ALTER TABLE lki_segments ENABLE TRIGGER trg_reassign_incidents_on_lki_change`.execute(
        trx,
      )

      this.log.debug({ upserted, deleted }, 'LKI upsert complete')
      return { upserted, deleted }
    })
  }

  async findLkiDensity(filters: DensityQuery): Promise<DensityResponse> {
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
      .orderBy(sql`weighted`, 'desc')
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
}

