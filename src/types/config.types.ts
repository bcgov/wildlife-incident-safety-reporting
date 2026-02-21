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
  logLevel: string
  closeGraceDelay: number
  rateLimitMax: number
}
