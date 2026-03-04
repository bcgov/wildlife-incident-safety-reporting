import type { IncidentsQuery } from '@schemas/incidents/incidents.schema.js'
import type { Expression, ExpressionBuilder, SqlBool } from 'kysely'
import { sql } from 'kysely'
import { geomFromGeoJSON, within } from 'kysely-postgis'
import type { DB } from './types/database.js'

type IncidentEB = ExpressionBuilder<
  DB & {
    wi: DB['wars_incidents']
    sp: DB['species']
    sa: DB['service_areas']
  },
  'wi' | 'sp' | 'sa'
>

export function applyFilters(eb: IncidentEB, filters: IncidentsQuery) {
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
