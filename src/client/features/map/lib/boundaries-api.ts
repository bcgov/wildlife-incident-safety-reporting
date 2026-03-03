import {
  type BoundariesResponse,
  BoundariesResponseSchema,
} from '@schemas/service-areas/boundaries.schema'
import { apiClient } from '@/lib/apiClient'

export const boundariesQueryKey = ['boundaries'] as const

export function fetchBoundaries(): Promise<BoundariesResponse> {
  return apiClient.get('/v1/service-areas/boundaries', BoundariesResponseSchema)
}
