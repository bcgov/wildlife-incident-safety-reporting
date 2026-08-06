import type { Geometry } from 'geojson'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useRouteStore } from '@/stores/route-store'

export type RouteFilter = {
  startLng: number
  startLat: number
  endLng: number
  endLat: number
  corridorMeters: number
}

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
  routeFilter: RouteFilter | null
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
  setRouteFilter: (routeFilter: RouteFilter | null) => void
  clearSpatialFilter: () => void
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
  routeFilter: null,
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
      // Drawn shapes and route corridors are both spatial filters, only one applies
      setGeometry: (geometry) => {
        if (geometry) useRouteStore.getState().clearRoute()
        set((state) => ({
          geometry,
          routeFilter: geometry ? null : state.routeFilter,
        }))
      },
      setRouteFilter: (routeFilter) =>
        set((state) => ({
          routeFilter,
          geometry: routeFilter ? null : state.geometry,
        })),
      clearSpatialFilter: () => {
        useRouteStore.getState().clearRoute()
        set({ geometry: null, routeFilter: null })
      },
      clearAll: () => {
        useRouteStore.getState().clearRoute()
        set(initialState)
      },
    }),
    { name: 'filter-store' },
  ),
)
