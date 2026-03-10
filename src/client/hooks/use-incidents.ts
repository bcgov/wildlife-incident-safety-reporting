import { useShallow } from 'zustand/react/shallow'
import { useAppQuery } from '@/hooks/use-app-query'
import { useFilterSelection } from '@/hooks/use-filter-selection'
import { fetchIncidents, incidentsQueryKey } from '@/lib/incidents-api'
import { useFilterStore } from '@/stores/filter-store'

export function useIncidents({ enabled = true } = {}) {
  const filters = useFilterSelection()

  const hasFilters = useFilterStore(
    useShallow((s) =>
      s.years.length > 0 ||
      s.species.length > 0 ||
      s.serviceAreas.length > 0 ||
      s.sex.length > 0 ||
      s.timeOfKill.length > 0 ||
      s.age.length > 0 ||
      s.startDate !== null ||
      s.endDate !== null ||
      s.geometry !== null,
    ),
  )

  return useAppQuery({
    queryKey: incidentsQueryKey(filters),
    queryFn: () => fetchIncidents(filters),
    enabled: enabled && hasFilters,
  })
}
