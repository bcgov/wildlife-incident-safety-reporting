import { YearSelectionSchema } from '@schemas/common/incident-query.schema'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useFilterSelection } from '@/hooks/use-filter-selection'
import { useMinLoading } from '@/hooks/use-min-loading'
import { $api } from '@/lib/api'
import { incidentQueryParams } from '@/lib/incidents-api'

export function useIncidents({ enabled = true } = {}) {
  const filters = useDebouncedValue(useFilterSelection(), 300)

  return useMinLoading(
    $api.useQuery(
      'get',
      '/v1/incidents/',
      { params: { query: incidentQueryParams(filters) } },
      {
        enabled:
          enabled && YearSelectionSchema.safeParse(filters.years).success,
      },
    ),
  )
}
