import { useMinLoading } from '@/hooks/use-min-loading'
import { $api } from '@/lib/api'
import { useLayerStore } from '../store/layer-store'

export function useBoundaries() {
  const visible = useLayerStore((s) => s.layers.boundaries)

  return useMinLoading(
    $api.useQuery(
      'get',
      '/v1/service-areas/boundaries',
      {},
      { staleTime: Number.POSITIVE_INFINITY, enabled: visible },
    ),
  )
}
