import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { FileMigrationProvider, Migrator } from 'kysely/migration'
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

async function rollback() {
  const { error, results } = await migrator.migrateDown()

  for (const result of results ?? []) {
    if (result.status === 'Success') {
      console.log(
        `Migration "${result.migrationName}" rolled back successfully`,
      )
    } else if (result.status === 'Error') {
      console.error(`Migration "${result.migrationName}" rollback failed`)
    }
  }

  if (error) {
    console.error('Rollback failed:', error)
  }

  await db.destroy()
}

rollback()
