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
      .selectFrom('wars_incidents as wi')
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
        .selectFrom('wars_incidents')
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
        .selectFrom('wars_incidents')
        .select('sex')
        .distinct()
        .where('sex', 'is not', null)
        .execute(),
      this.kysely
        .selectFrom('wars_incidents')
        .select('time_of_kill')
        .distinct()
        .where('time_of_kill', 'is not', null)
        .execute(),
      this.kysely
        .selectFrom('wars_incidents')
        .select('age')
        .distinct()
        .where('age', 'is not', null)
        .execute(),
      this.kysely
        .selectFrom('wars_incidents')
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
          .insertInto('wars_incidents')
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
                  wars_incidents.accident_date IS DISTINCT FROM excluded.accident_date
                  OR wars_incidents.time_of_kill IS DISTINCT FROM excluded.time_of_kill
                  OR wars_incidents.nearest_town IS DISTINCT FROM excluded.nearest_town
                  OR wars_incidents.sex IS DISTINCT FROM excluded.sex
                  OR wars_incidents.age IS DISTINCT FROM excluded.age
                  OR wars_incidents.comments IS DISTINCT FROM excluded.comments
                  OR wars_incidents.quantity IS DISTINCT FROM excluded.quantity
                  OR wars_incidents.latitude IS DISTINCT FROM excluded.latitude
                  OR wars_incidents.longitude IS DISTINCT FROM excluded.longitude
                  OR wars_incidents.species_id IS DISTINCT FROM excluded.species_id
                  OR wars_incidents.year IS DISTINCT FROM excluded.year
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
}
