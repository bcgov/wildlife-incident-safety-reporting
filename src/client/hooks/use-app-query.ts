import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
} from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { MIN_LOADING_DELAY } from '@/lib/constants'

// Initial load (no data yet): shows skeleton for at least MIN_LOADING_DELAY.
// Refetch (has stale data): shows stale data silently, no loading indicator.
export function useAppQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const query = useQuery(options)

  // Also triggers after resetQueries clears the cache
  const isLoadingWithoutData = query.isFetching && query.data === undefined

  // Min duration state for loading (skeleton)
  const [showLoading, setShowLoading] = useState(isLoadingWithoutData)
  const loadingStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (isLoadingWithoutData) {
      if (!loadingStartRef.current) {
        loadingStartRef.current = Date.now()
        setShowLoading(true)
      }
    } else if (loadingStartRef.current) {
      const elapsed = Date.now() - loadingStartRef.current
      const remaining = MIN_LOADING_DELAY - elapsed

      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShowLoading(false)
          loadingStartRef.current = null
        }, remaining)
        return () => clearTimeout(timer)
      }

      setShowLoading(false)
      loadingStartRef.current = null
    }
  }, [isLoadingWithoutData])

  return {
    ...query,
    isLoading: showLoading,
  }
}

// Enforces MIN_LOADING_DELAY on isPending for consistent UI feedback
export function useAppMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(options: UseMutationOptions<TData, TError, TVariables, TContext>) {
  const mutation = useMutation(options)
  const [isPendingWithMin, setIsPendingWithMin] = useState(false)
  const loadingStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (mutation.isPending) {
      if (!loadingStartRef.current) {
        loadingStartRef.current = Date.now()
        setIsPendingWithMin(true)
      }
    } else if (loadingStartRef.current) {
      const elapsed = Date.now() - loadingStartRef.current
      const remaining = MIN_LOADING_DELAY - elapsed

      if (remaining > 0) {
        const timer = setTimeout(() => {
          setIsPendingWithMin(false)
          loadingStartRef.current = null
        }, remaining)
        return () => clearTimeout(timer)
      }

      setIsPendingWithMin(false)
      loadingStartRef.current = null
    }
  }, [mutation.isPending])

  return {
    ...mutation,
    isPending: isPendingWithMin,
  }
}
