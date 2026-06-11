import { YearSelectionSchema } from '@schemas/common/incident-query.schema'
import { useAppQuery } from '@/hooks/use-app-query'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFilterSelection } from '@/hooks/use-filter-selection'
import { fetchIncidents, incidentsQueryKey } from '@/lib/incidents-api'

export function useIncidents({ enabled = true } = {}) {
  const filters = useDebouncedValue(useFilterSelection(), 300)

  return useAppQuery({
    queryKey: incidentsQueryKey(filters),
    queryFn: () => fetchIncidents(filters),
    enabled: enabled && YearSelectionSchema.safeParse(filters.years).success,
  })
}
