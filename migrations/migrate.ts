import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { FileMigrationProvider, Migrator, sql } from 'kysely'
import { createDatabase } from '../src/services/database/create-database.js'

const db = createDatabase()

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder: path.resolve(import.meta.dir, 'migrations'),
  }),
})

// postgres owns tables created during migration; grant DML to app user here and via ALTER DEFAULT PRIVILEGES for future tables.
async function grantAppUserPrivileges(appUser: string) {
  const ident = sql.id(appUser)
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ident}`.execute(
    db,
  )
  await sql`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${ident}`.execute(
    db,
  )
  await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ident}`.execute(
    db,
  )
  await sql`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${ident}`.execute(
    db,
  )
}

async function migrate() {
  const { error, results } = await migrator.migrateToLatest()

  for (const result of results ?? []) {
    if (result.status === 'Success') {
      console.log(`Migration "${result.migrationName}" applied successfully`)
    } else if (result.status === 'Error') {
      console.error(`Migration "${result.migrationName}" failed`)
    }
  }

  if (error) {
    console.error('Migration failed:', error)
    await db.destroy()
    process.exit(1)
  }

  const appUser = process.env.APP_DB_USER
  if (appUser && appUser !== process.env.DB_USER) {
    console.log(`Granting privileges on public schema to "${appUser}"`)
    await grantAppUserPrivileges(appUser)
  }

  console.log('Migrations completed successfully')
  await db.destroy()
}

migrate()
