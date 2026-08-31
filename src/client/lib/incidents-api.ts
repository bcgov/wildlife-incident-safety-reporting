import type { Geometry } from 'geojson'
import type { RouteFilter } from '@/stores/filter-store'
import type { paths } from '@/types/api'

export type IncidentFilters = {
  years: number[]
  species: number[]
  serviceAreas: number[]
  sex: string[]
  timeOfKill: string[]
  age: string[]
  startDate: string | null
  endDate: string | null
  geometry: Geometry | null
  routeFilter: RouteFilter | null
}

type IncidentQuery = paths['/v1/incidents/']['get']['parameters']['query']

export function incidentQueryParams(filters: IncidentFilters): IncidentQuery {
  const query: IncidentQuery = { year: filters.years.join(',') }

  if (filters.species.length > 0) query.species = filters.species.join(',')
  if (filters.serviceAreas.length > 0)
    query.serviceArea = filters.serviceAreas.join(',')
  if (filters.sex.length > 0) query.sex = filters.sex.join(',')
  if (filters.timeOfKill.length > 0)
    query.timeOfKill = filters.timeOfKill.join(',')
  if (filters.age.length > 0) query.age = filters.age.join(',')
  if (filters.startDate) query.startDate = filters.startDate
  if (filters.endDate) query.endDate = filters.endDate
  if (filters.geometry) query.geometry = JSON.stringify(filters.geometry)

  const { routeFilter } = filters
  if (routeFilter) {
    query.routeStartLng = routeFilter.startLng
    query.routeStartLat = routeFilter.startLat
    query.routeEndLng = routeFilter.endLng
    query.routeEndLat = routeFilter.endLat
    query.routeCorridorM = routeFilter.corridorMeters
  }

  return query
}
