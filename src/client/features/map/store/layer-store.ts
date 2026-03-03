import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

type LayerState = {
  layers: Record<string, boolean>
}

type LayerActions = {
  toggleLayer: (id: string) => void
  setLayerVisible: (id: string, visible: boolean) => void
}

const initialState: LayerState = {
  layers: {
    boundaries: false,
  },
}

export const useLayerStore = create<LayerState & LayerActions>()(
  devtools(
    (set) => ({
      ...initialState,
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
