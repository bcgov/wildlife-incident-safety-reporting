import './styles/globals.css'
import './styles/fonts.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { keycloak } from '@/lib/keycloak'
import { queryClient } from '@/lib/queryClient'
import { router } from '@/router/router'
import { useAuthStore } from '@/stores/auth-store'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

const rootElement = document.getElementById('app')
if (rootElement === null) throw new Error('Root element not found')

const root = createRoot(rootElement)
root.render(<App />)

keycloak.onTokenExpired = () => {
  keycloak.updateToken(5).catch(() => {
    keycloak.login({ redirectUri: window.location.origin })
  })
}

const isProd = import.meta.env.PROD

keycloak
  .init({
    checkLoginIframe: false,
    pkceMethod: 'S256',
    onLoad: isProd ? 'check-sso' : undefined,
    silentCheckSsoRedirectUri: isProd
      ? `${window.location.origin}/silent-check-sso.html`
      : undefined,
  })
  .then((authenticated) => useAuthStore.getState().initialize(authenticated))
  .catch(() => useAuthStore.getState().initialize(false))
