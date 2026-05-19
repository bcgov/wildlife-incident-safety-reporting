import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type Basemap = 'standard' | 'satellite' | 'hybrid'
export type DensityMode = 'weighted' | 'raw'

type LayerState = {
  basemap: Basemap
  layers: Record<string, boolean>
  densityMode: DensityMode
}

type LayerActions = {
  setBasemap: (basemap: Basemap) => void
  toggleLayer: (id: string) => void
  setLayerVisible: (id: string, visible: boolean) => void
  setDensityMode: (mode: DensityMode) => void
}

const initialState: LayerState = {
  basemap: 'standard',
  layers: {
    boundaries: false,
    density: false,
  },
  densityMode: 'weighted',
}

export const useLayerStore = create<LayerState & LayerActions>()(
  devtools(
    (set) => ({
      ...initialState,
      setBasemap: (basemap) => set({ basemap }),
      toggleLayer: (id) =>
        set((state) => ({
          layers: { ...state.layers, [id]: !state.layers[id] },
        })),
      setLayerVisible: (id, visible) =>
        set((state) => ({
          layers: { ...state.layers, [id]: visible },
        })),
      setDensityMode: (densityMode) => set({ densityMode }),
    }),
    { name: 'layer-store' },
  ),
)
