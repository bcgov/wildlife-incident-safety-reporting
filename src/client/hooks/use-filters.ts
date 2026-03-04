import { useAppQuery } from '@/hooks/use-app-query'
import { fetchFilters, filtersQueryKey } from '@/lib/filters-api'

export function useFilters() {
  return useAppQuery({
    queryKey: filtersQueryKey,
    queryFn: fetchFilters,
    staleTime: 5 * 60 * 1000, // 5 minutes - filter options rarely change
  })
}
