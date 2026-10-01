import { useMinLoading } from '@/hooks/use-min-loading'
import { $api } from '@/lib/api'

export function useLkiSegments({ enabled = true } = {}) {
  return useMinLoading(
    $api.useQuery(
      'get',
      '/v1/lki/segments',
      {},
      { staleTime: Number.POSITIVE_INFINITY, enabled },
    ),
  )
}
