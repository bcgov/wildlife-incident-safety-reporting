import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type ServiceArea = {
  name: string
  contractAreaNumber: number
  district: string
  region: string
}

type Location = {
  longitude: number
  latitude: number
  address: string
  serviceArea?: ServiceArea | null
}

type LocationState = {
  location: Location | null
  setLocation: (location: Location) => void
  clearLocation: () => void
}

export const useLocationStore = create<LocationState>()(
  devtools(
    (set) => ({
      location: null,
      setLocation: (location) => set({ location }),
      clearLocation: () => set({ location: null }),
    }),
    { name: 'location-store' },
  ),
)
