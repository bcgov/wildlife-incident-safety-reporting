import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { keycloak } from '@/lib/keycloak'

type AuthState = {
  initialized: boolean
  authenticated: boolean
  initialize: (authenticated: boolean) => void
  login: () => void
  logout: () => void
  getToken: () => Promise<string | undefined>
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      initialized: false,
      authenticated: false,

      initialize: (authenticated) => set({ initialized: true, authenticated }),

      login: () => {
        keycloak.login({
          redirectUri: `${window.location.origin}/`,
          idpHint: 'azureidir',
        })
      },

      logout: () => {
        keycloak.logout({
          redirectUri: `${window.location.origin}/`,
        })
      },

      getToken: async () => {
        try {
          await keycloak.updateToken(30)
          return keycloak.token
        } catch {
          set({ authenticated: false })
          return undefined
        }
      },
    }),
    { name: 'auth-store' },
  ),
)
