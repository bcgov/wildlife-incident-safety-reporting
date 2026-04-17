import Keycloak from 'keycloak-js'
import { config } from '@/lib/config'

export const keycloak = new Keycloak({
  url: config.keycloakUrl,
  realm: config.keycloakRealm,
  clientId: config.keycloakClientId,
})
