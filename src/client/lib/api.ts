import createFetchClient from 'openapi-fetch'
import createClient from 'openapi-react-query'
import { useAuthStore } from '@/stores/auth-store'
import type { paths } from '@/types/api'

export const apiFetch = createFetchClient<paths>()

apiFetch.use({
  onRequest({ request }) {
    const token = useAuthStore.getState().getToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },
  onResponse({ response }) {
    if (response.status === 401) {
      useAuthStore.getState().login(window.location.href)
    }
    return response
  },
})

export const $api = createClient(apiFetch)

// openapi-fetch surfaces the parsed error body, not an Error instance
export function apiErrorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }
  return null
}
