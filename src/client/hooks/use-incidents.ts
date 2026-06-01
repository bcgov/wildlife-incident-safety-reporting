import { MAX_SELECTED_YEARS } from '@schemas/common/incident-query.schema'
import { useAppQuery } from '@/hooks/use-app-query'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFilterSelection } from '@/hooks/use-filter-selection'
import { fetchIncidents, incidentsQueryKey } from '@/lib/incidents-api'

export function useIncidents({ enabled = true } = {}) {
  const filters = useDebouncedValue(useFilterSelection(), 300)

  const hasFilters =
    filters.years.length > 0 ||
    filters.species.length > 0 ||
    filters.serviceAreas.length > 0 ||
    filters.sex.length > 0 ||
    filters.timeOfKill.length > 0 ||
    filters.age.length > 0 ||
    filters.startDate !== null ||
    filters.endDate !== null ||
    filters.geometry !== null

  return useAppQuery({
    queryKey: incidentsQueryKey(filters),
    queryFn: () => fetchIncidents(filters),
    enabled:
      enabled && hasFilters && filters.years.length <= MAX_SELECTED_YEARS,
  })
}
