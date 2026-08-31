import { useMinLoading } from '@/hooks/use-min-loading'
import { $api } from '@/lib/api'

export function useFilters() {
  return useMinLoading(
    $api.useQuery(
      'get',
      '/v1/incidents/filters',
      {},
      { staleTime: 5 * 60 * 1000 }, // 5 minutes - filter options rarely change
    ),
  )
}
