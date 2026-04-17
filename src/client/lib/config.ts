interface ClientConfig {
  keycloakUrl: string
  keycloakRealm: string
  keycloakClientId: string
  googleMapsApiKey: string
}

declare global {
  interface Window {
    __CONFIG__?: ClientConfig
  }
}

function resolveConfig(): ClientConfig {
  const injected = window.__CONFIG__
  if (!injected) {
    throw new Error(
      'window.__CONFIG__ missing — server-side config injection plugin is not registered or the SPA was loaded outside Fastify',
    )
  }
  return injected
}

export const config = resolveConfig()
