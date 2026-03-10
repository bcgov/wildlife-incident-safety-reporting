import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from './apiClient'

function getErrorMessage(error: Error): string {
  if (error instanceof ApiError) return error.message
  return 'An unexpected error occurred'
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(getErrorMessage(error), {
        id: `query-error-${String(query.queryHash)}`,
      })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.suppressGlobalError) return
      toast.error(getErrorMessage(error), {
        id: `mutation-error-${String(mutation.mutationId)}`,
      })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0, // Don't retry mutations by default
    },
  },
})
