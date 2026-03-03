import type { Geometry } from 'geojson'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type FilterState = {
  years: number[]
  species: number[]
  serviceAreas: number[]
  sex: string[]
  timeOfKill: string[]
  age: string[]
  startDate: string | null
  endDate: string | null
  geometry: Geometry | null
}

type FilterActions = {
  setYears: (years: number[]) => void
  setSpecies: (species: number[]) => void
  setServiceAreas: (serviceAreas: number[]) => void
  setSex: (sex: string[]) => void
  setTimeOfKill: (timeOfKill: string[]) => void
  setAge: (age: string[]) => void
  setStartDate: (date: string | null) => void
  setEndDate: (date: string | null) => void
  setGeometry: (geometry: Geometry | null) => void
  clearAll: () => void
}

const initialState: FilterState = {
  years: [],
  species: [],
  serviceAreas: [],
  sex: [],
  timeOfKill: [],
  age: [],
  startDate: null,
  endDate: null,
  geometry: null,
}

export const useFilterStore = create<FilterState & FilterActions>()(
  devtools(
    (set) => ({
      ...initialState,
      setYears: (years) => set({ years }),
      setSpecies: (species) => set({ species }),
      setServiceAreas: (serviceAreas) => set({ serviceAreas }),
      setSex: (sex) => set({ sex }),
      setTimeOfKill: (timeOfKill) => set({ timeOfKill }),
      setAge: (age) => set({ age }),
      setStartDate: (date) => set({ startDate: date }),
      setEndDate: (date) => set({ endDate: date }),
      setGeometry: (geometry) => set({ geometry }),
      clearAll: () => set(initialState),
    }),
    { name: 'filter-store' },
  ),
)
