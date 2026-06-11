import { YearSelectionSchema } from '@schemas/common/incident-query.schema'
import { useAppQuery } from '@/hooks/use-app-query'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFilterSelection } from '@/hooks/use-filter-selection'
import { densityQueryKey, fetchDensity } from '@/lib/density-api'

export function useDensityData({ enabled = true } = {}) {
  const filters = useDebouncedValue(useFilterSelection(), 300)

  return useAppQuery({
    queryKey: densityQueryKey(filters),
    queryFn: () => fetchDensity(filters),
    enabled: enabled && YearSelectionSchema.safeParse(filters.years).success,
  })
}
