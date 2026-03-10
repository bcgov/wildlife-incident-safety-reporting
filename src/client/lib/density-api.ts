import type { DensityResponse } from '@schemas/incidents/density.schema'
import { apiClient } from '@/lib/apiClient'
import { buildQueryString, type IncidentFilters } from '@/lib/incidents-api'

export type DensitySegment = DensityResponse[number]

export const densityQueryKey = (filters: IncidentFilters) =>
  ['density', filters] as const

export function fetchDensity(
  filters: IncidentFilters,
): Promise<DensitySegment[]> {
  return apiClient.get<DensitySegment[]>(
    `/v1/incidents/density${buildQueryString(filters)}`,
  )
}
