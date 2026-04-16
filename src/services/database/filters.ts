import type { IncidentFilterQuery } from '@schemas/common/incident-query.schema.js'
import type { Expression, ExpressionBuilder, SqlBool } from 'kysely'
import { sql } from 'kysely'
import { geomFromGeoJSON, within } from 'kysely-postgis'
import type { DB } from './types/database.js'

type FilterFields = Pick<
  IncidentFilterQuery,
  | 'year'
  | 'species'
  | 'serviceArea'
  | 'sex'
  | 'timeOfKill'
  | 'age'
  | 'startDate'
  | 'endDate'
  | 'geometry'
>

type IncidentEB = ExpressionBuilder<
  DB & {
    wi: DB['incidents']
    sp: DB['species']
    sa: DB['service_areas']
  },
  'wi' | 'sp' | 'sa'
>

type DensityEB = ExpressionBuilder<
  DB & {
    wi: DB['incidents']
    sp: DB['species']
  },
  'wi' | 'sp'
>

export function applyFilters(
  eb: IncidentEB | DensityEB,
  filters: FilterFields,
) {
  const conditions: Expression<SqlBool>[] = []

  // All filters target wi.* columns, so DensityEB (the common subset) works for both callers
  const w = eb as DensityEB

  if (filters.year?.length) {
    conditions.push(w('wi.year', 'in', filters.year))
  }
  if (filters.species?.length) {
    conditions.push(w('wi.species_id', 'in', filters.species))
  }
  if (filters.serviceArea?.length) {
    conditions.push(w('wi.service_area_id', 'in', filters.serviceArea))
  }
  if (filters.sex?.length) {
    conditions.push(w('wi.sex', 'in', filters.sex))
  }
  if (filters.timeOfKill?.length) {
    conditions.push(w('wi.time_of_kill', 'in', filters.timeOfKill))
  }
  if (filters.age?.length) {
    conditions.push(w('wi.age', 'in', filters.age))
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
    conditions.push(within(w, 'wi.geom', geomFromGeoJSON(w, filters.geometry)))
  }

  return w.and(conditions)
}
