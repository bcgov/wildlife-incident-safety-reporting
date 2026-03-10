import type { Geometry } from 'geojson'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type LocateTarget = {
  segmentId: number
  segmentName: string
  geometry: Geometry
}

type SegmentLocateState = {
  target: LocateTarget | null
  locate: (target: LocateTarget) => void
  clear: () => void
}

export const useSegmentLocateStore = create<SegmentLocateState>()(
  devtools(
    (set) => ({
      target: null,
      locate: (target) => set({ target }),
      clear: () => set({ target: null }),
    }),
    { name: 'segment-locate-store' },
  ),
)
