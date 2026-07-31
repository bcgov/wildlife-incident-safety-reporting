import type { RouteResponse } from '@schemas/route-planner/route.schema'
import { apiClient } from '@/lib/apiClient'
import type { RoutePoint } from '@/stores/route-store'

export const routeQueryKey = (start: RoutePoint, end: RoutePoint) =>
  [
    'route',
    start.longitude,
    start.latitude,
    end.longitude,
    end.latitude,
  ] as const

export function fetchRoute(
  start: RoutePoint,
  end: RoutePoint,
): Promise<RouteResponse> {
  const params = new URLSearchParams({
    startLng: String(start.longitude),
    startLat: String(start.latitude),
    endLng: String(end.longitude),
    endLat: String(end.latitude),
  })
  return apiClient.get<RouteResponse>(`/v1/route?${params}`)
}
