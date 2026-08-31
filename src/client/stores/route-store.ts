import { DEFAULT_CORRIDOR_METERS } from '@schemas/common/incident-query.schema'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type RoutePoint = {
  longitude: number
  latitude: number
  address: string
}

type RouteState = {
  start: RoutePoint | null
  end: RoutePoint | null
  corridorMeters: number
}

type RouteActions = {
  setStart: (point: RoutePoint | null) => void
  setEnd: (point: RoutePoint | null) => void
  setCorridorMeters: (meters: number) => void
  clearRoute: () => void
}

export const useRouteStore = create<RouteState & RouteActions>()(
  devtools(
    (set) => ({
      start: null,
      end: null,
      corridorMeters: DEFAULT_CORRIDOR_METERS,
      setStart: (start) => set({ start }),
      setEnd: (end) => set({ end }),
      setCorridorMeters: (corridorMeters) => set({ corridorMeters }),
      clearRoute: () =>
        set({
          start: null,
          end: null,
          corridorMeters: DEFAULT_CORRIDOR_METERS,
        }),
    }),
    { name: 'route-store' },
  ),
)
