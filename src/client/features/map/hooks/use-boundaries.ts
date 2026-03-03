import { useAppQuery } from '@/lib/useAppQuery'
import { boundariesQueryKey, fetchBoundaries } from '../lib/boundaries-api'
import { useLayerStore } from '../store/layer-store'

export function useBoundaries() {
  const visible = useLayerStore((s) => s.layers.boundaries)

  return useAppQuery({
    queryKey: boundariesQueryKey,
    queryFn: fetchBoundaries,
    staleTime: Number.POSITIVE_INFINITY,
    enabled: visible,
  })
}
