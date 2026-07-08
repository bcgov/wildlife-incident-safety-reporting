export interface Config {
  baseUrl: string
  port: number
  listenPort: number
  dbHost: string
  dbPort: number
  dbName: string
  dbUser: string
  dbPassword: string
  databaseUrl: string
  dbPoolSize: number
  dbIdleTimeout: number
  dbMaxLifetime: number
  logLevel: string
  closeGraceDelay: number
  rateLimitMax: number
  corsOrigin: string
  keycloakUrl: string
  keycloakRealm: string
  keycloakClientId: string
  siteminderLogoutUrl: string
  googleMapsClientApiKey: string
  baseMapStyleUrl: string
  hmcrId: string
  hmcrSecret: string
  hmcrApiUrl: string
  hmcrTokenUrl: string
}
