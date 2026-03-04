import { useMemo } from 'react'
import { useAppQuery } from '@/hooks/use-app-query'
import type { IncidentFilters } from '@/lib/incidents-api'
import { fetchIncidents, incidentsQueryKey } from '@/lib/incidents-api'
import { useFilterStore } from '@/stores/filter-store'

export function useIncidents() {
  const years = useFilterStore((s) => s.years)
  const species = useFilterStore((s) => s.species)
  const serviceAreas = useFilterStore((s) => s.serviceAreas)
  const sex = useFilterStore((s) => s.sex)
  const timeOfKill = useFilterStore((s) => s.timeOfKill)
  const age = useFilterStore((s) => s.age)
  const startDate = useFilterStore((s) => s.startDate)
  const endDate = useFilterStore((s) => s.endDate)
  const geometry = useFilterStore((s) => s.geometry)

  const filters: IncidentFilters = useMemo(
    () => ({
      years,
      species,
      serviceAreas,
      sex,
      timeOfKill,
      age,
      startDate,
      endDate,
      geometry,
    }),
    [
      years,
      species,
      serviceAreas,
      sex,
      timeOfKill,
      age,
      startDate,
      endDate,
      geometry,
    ],
  )

  const hasFilters =
    years.length > 0 ||
    species.length > 0 ||
    serviceAreas.length > 0 ||
    sex.length > 0 ||
    timeOfKill.length > 0 ||
    age.length > 0 ||
    startDate !== null ||
    endDate !== null ||
    geometry !== null

  return useAppQuery({
    queryKey: incidentsQueryKey(filters),
    queryFn: () => fetchIncidents(filters),
    enabled: hasFilters,
  })
}
