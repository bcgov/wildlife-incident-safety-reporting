import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type DataViewOption = 'incidents' | 'density'

type DataViewState = {
  dataView: DataViewOption
  setDataView: (view: DataViewOption) => void
}

export const useDataViewStore = create<DataViewState>()(
  devtools(
    (set) => ({
      dataView: 'incidents',
      setDataView: (dataView) => set({ dataView }),
    }),
    { name: 'data-view-store' },
  ),
)
