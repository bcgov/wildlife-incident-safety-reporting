import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type Basemap = 'roadmap' | 'satellite' | 'hybrid' | 'traffic'

type LayerState = {
  basemap: Basemap
  layers: Record<string, boolean>
}

type LayerActions = {
  setBasemap: (basemap: Basemap) => void
  toggleLayer: (id: string) => void
  setLayerVisible: (id: string, visible: boolean) => void
}

const initialState: LayerState = {
  basemap: 'roadmap',
  layers: {
    boundaries: false,
  },
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
    }),
    { name: 'layer-store' },
  ),
)
