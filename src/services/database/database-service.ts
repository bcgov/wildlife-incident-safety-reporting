import type { IncidentFiltersResponse } from '@schemas/incidents/filters.schema.js'
import type {
  Incident,
  IncidentsQuery,
} from '@schemas/incidents/incidents.schema.js'
import type { Expression, ExpressionBuilder, Kysely, SqlBool } from 'kysely'
import { sql } from 'kysely'
import { geomFromGeoJSON, within } from 'kysely-postgis'
import { toIncident } from './mappers/incidents.js'
import type { DB } from './types/database.js'

type IncidentEB = ExpressionBuilder<
  DB & {
    wi: DB['wars_incidents']
    sp: DB['species']
    sa: DB['service_areas']
  },
  'wi' | 'sp' | 'sa'
>

function applyFilters(eb: IncidentEB, filters: IncidentsQuery) {
  const conditions: Expression<SqlBool>[] = []

  if (filters.year?.length) {
    conditions.push(eb('wi.year', 'in', filters.year))
  }
  if (filters.species?.length) {
    conditions.push(eb('wi.species_id', 'in', filters.species))
  }
  if (filters.serviceArea?.length) {
    conditions.push(eb('wi.service_area_id', 'in', filters.serviceArea))
  }
  if (filters.sex?.length) {
    conditions.push(eb('wi.sex', 'in', filters.sex))
  }
  if (filters.timeOfKill?.length) {
    conditions.push(eb('wi.time_of_kill', 'in', filters.timeOfKill))
  }
  if (filters.age?.length) {
    conditions.push(eb('wi.age', 'in', filters.age))
  }
  if (filters.startDate) {
    conditions.push(
      sql<boolean>`wi.accident_date::date >= ${filters.startDate}::date`,
    )
  }
  if (filters.endDate) {
    conditions.push(
      sql<boolean>`wi.accident_date::date <= ${filters.endDate}::date`,
    )
  }
  if (filters.geometry) {
    conditions.push(
      within(eb, 'wi.geom', geomFromGeoJSON(eb, filters.geometry)),
    )
  }

  return eb.and(conditions)
}

export class DatabaseService {
  constructor(private readonly kysely: Kysely<DB>) {}

  async healthCheck(): Promise<void> {
    await sql`SELECT 1`.execute(this.kysely)
  }

  async destroy() {
    await this.kysely.destroy()
  }

  async findIncidents(
    filters: IncidentsQuery,
  ): Promise<{ data: Incident[]; total: number }> {
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
        'wi.sex',
        'wi.time_of_kill',
        'wi.age',
        'wi.quantity',
        'wi.latitude',
        'wi.longitude',
        'wi.nearest_town',
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

      return {
        data: rows.map(toIncident),
        total: Number(countResult.total),
      }
    }

    const rows = await dataQuery.execute()

    return {
      data: rows.map(toIncident),
      total: rows.length,
    }
  }

  async findIncidentFilters(): Promise<IncidentFiltersResponse> {
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
        .select(['id', 'name', 'contract_area_number'])
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
}
