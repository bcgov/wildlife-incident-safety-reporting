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
  logLevel: string
  closeGraceDelay: number
  rateLimitMax: number
  keycloakUrl: string
  keycloakRealm: string
  keycloakClientId: string
  hmcrId: string
  hmcrSecret: string
  hmcrApiUrl: string
  hmcrTokenUrl: string
}
