import { useSpinDelay } from 'spin-delay'
import { LOADER_SHOW_DELAY, MIN_LOADING_DELAY } from '@/lib/constants'

// ssr:false because nothing server-renders here and the default skips the show delay
export function useMinDuration(active: boolean): boolean {
  return useSpinDelay(active, {
    delay: 0,
    minDuration: MIN_LOADING_DELAY,
    ssr: false,
  })
}

export function useShowLoading(loading: boolean): boolean {
  return useSpinDelay(loading, {
    delay: LOADER_SHOW_DELAY,
    minDuration: MIN_LOADING_DELAY,
    ssr: false,
  })
}

export function useMinLoading<
  T extends { isFetching: boolean; isLoading: boolean; data: unknown },
>(query: T): T {
  const loadingWithoutData = query.isFetching && query.data === undefined
  const showLoading = useSpinDelay(loadingWithoutData, {
    delay: LOADER_SHOW_DELAY,
    minDuration: MIN_LOADING_DELAY,
    ssr: false,
  })

  return { ...query, isLoading: showLoading }
}
