import { useShallow } from 'zustand/react/shallow'
import type { IncidentFilters } from '@/lib/incidents-api'
import { useFilterStore } from '@/stores/filter-store'

export function useFilterSelection(): IncidentFilters {
  return useFilterStore(
    useShallow((s) => ({
      years: s.years,
      species: s.species,
      serviceAreas: s.serviceAreas,
      sex: s.sex,
      timeOfKill: s.timeOfKill,
      age: s.age,
      startDate: s.startDate,
      endDate: s.endDate,
      geometry: s.geometry,
    })),
  )
}
