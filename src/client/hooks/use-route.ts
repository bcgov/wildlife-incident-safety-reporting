import { useQuery } from '@tanstack/react-query'
import { fetchRoute, routeQueryKey } from '@/lib/route-api'
import { useRouteStore } from '@/stores/route-store'

// The road network updates roughly monthly, so cached routes stay valid all session
const ROUTE_STALE_TIME = 24 * 60 * 60 * 1000

export function useRoute() {
  const start = useRouteStore((s) => s.start)
  const end = useRouteStore((s) => s.end)
  const points = start && end ? { start, end } : null

  return useQuery({
    queryKey: points
      ? routeQueryKey(points.start, points.end)
      : (['route', 'idle'] as const),
    queryFn: () => {
      if (!points) throw new Error('Route points not set')
      return fetchRoute(points.start, points.end)
    },
    enabled: points !== null,
    staleTime: ROUTE_STALE_TIME,
  })
}
