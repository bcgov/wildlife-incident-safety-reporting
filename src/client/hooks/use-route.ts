import { $api } from '@/lib/api'
import { useRouteStore } from '@/stores/route-store'

// The road network updates roughly monthly, so cached routes stay valid all session
const ROUTE_STALE_TIME = 24 * 60 * 60 * 1000

export function useRoute() {
  const start = useRouteStore((s) => s.start)
  const end = useRouteStore((s) => s.end)
  const points = start && end ? { start, end } : null

  return $api.useQuery(
    'get',
    '/v1/route/',
    {
      params: {
        query: {
          startLng: points?.start.longitude ?? 0,
          startLat: points?.start.latitude ?? 0,
          endLng: points?.end.longitude ?? 0,
          endLat: points?.end.latitude ?? 0,
        },
      },
    },
    { enabled: points !== null, staleTime: ROUTE_STALE_TIME },
  )
}
