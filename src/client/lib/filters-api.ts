import {
  type IncidentFiltersResponse,
  IncidentFiltersResponseSchema,
} from '@schemas/incidents/filters.schema'
import { apiClient } from '@/lib/apiClient'

export const filtersQueryKey = ['incident-filters'] as const

export function fetchFilters(): Promise<IncidentFiltersResponse> {
  return apiClient.get('/v1/incidents/filters', IncidentFiltersResponseSchema)
}
