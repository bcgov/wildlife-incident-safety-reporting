import { useAppQuery } from '@/hooks/use-app-query'
import { useFilterSelection } from '@/hooks/use-filter-selection'
import { densityQueryKey, fetchDensity } from '@/lib/density-api'

export function useDensityData({ enabled = true } = {}) {
  const filters = useFilterSelection()

  return useAppQuery({
    queryKey: densityQueryKey(filters),
    queryFn: () => fetchDensity(filters),
    enabled,
  })
}
