import {
  type IncidentsResponse,
  IncidentsResponseSchema,
} from '@schemas/incidents/incidents.schema'
import type { Geometry } from 'geojson'
import { apiClient } from '@/lib/apiClient'

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
}

export const incidentsQueryKey = (filters: IncidentFilters) =>
  ['incidents', filters] as const

function buildQueryString(filters: IncidentFilters): string {
  const params = new URLSearchParams()

  if (filters.years.length > 0) params.set('year', filters.years.join(','))
  if (filters.species.length > 0)
    params.set('species', filters.species.join(','))
  if (filters.serviceAreas.length > 0)
    params.set('serviceArea', filters.serviceAreas.join(','))
  if (filters.sex.length > 0) params.set('sex', filters.sex.join(','))
  if (filters.timeOfKill.length > 0)
    params.set('timeOfKill', filters.timeOfKill.join(','))
  if (filters.age.length > 0) params.set('age', filters.age.join(','))
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.geometry) params.set('geometry', JSON.stringify(filters.geometry))

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function fetchIncidents(
  filters: IncidentFilters,
): Promise<IncidentsResponse> {
  return apiClient.get(
    `/v1/incidents${buildQueryString(filters)}`,
    IncidentsResponseSchema,
  )
}
