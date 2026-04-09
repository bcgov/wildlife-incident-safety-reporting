import { promises as fs } from 'node:fs'
import * as path from 'node:path'

export async function setup(): Promise<void> {
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'silent'
  process.env.PORT = '3004'
  process.env.DOTENV_CONFIG_QUIET = 'true'

  // Database - points at the wars_test DB created by docker/init-test-db.sql
  process.env.DB_HOST = 'localhost'
  process.env.DB_PORT = '5432'
  process.env.DB_USER = 'postgres'
  process.env.DB_PASSWORD = 'postgres'
  process.env.DB_NAME = 'wars_test'

  // Required by the config plugin but not exercised in tests (MSW stubs HTTP)
  process.env.KEYCLOAK_URL = 'http://localhost:8080'
  process.env.KEYCLOAK_REALM = 'test'
  process.env.KEYCLOAK_CLIENT_ID = 'test-client'
  process.env.HMCR_ID = 'test-hmcr-id'
  process.env.HMCR_SECRET = 'test-hmcr-secret'
  process.env.HMCR_API_URL = 'http://localhost:9090/api'
  process.env.HMCR_TOKEN_URL = 'http://localhost:9090/token'

  const { createDatabase } = await import(
    '../../src/services/database/create-database.js'
  )
  const { FileMigrationProvider, Migrator } = await import('kysely')

  const db = createDatabase({ database: 'wars_test' })

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.resolve(process.cwd(), 'migrations/migrations'),
    }),
  })

  const { error } = await migrator.migrateToLatest()
  if (error) {
    await db.destroy()
    throw new Error('Test migration failed', { cause: error })
  }

  await db.destroy()
}

export async function teardown(): Promise<void> {
  try {
    const { cleanupTestDatabase } = await import('../helpers/database.js')
    await cleanupTestDatabase()
  } catch {
    // Don't throw - allow tests to complete even if cleanup fails
  }
}
