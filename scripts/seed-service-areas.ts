import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { sql } from 'kysely'

import { createDatabase } from '../src/services/database/create-database.js'

interface GeoJsonFeature {
  type: 'Feature'
  properties: {
    CONTRACT_AREA_NUMBER: number
    CONTRACT_AREA_NAME: string
  }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

interface GeoJsonCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

const db = createDatabase()

async function seedServiceAreas() {
  const root = path.resolve(import.meta.dir, '..')
  const seedPath = path.join(root, 'data', 'seed', 'service-areas.geojson')
  const samplePath = path.join(root, 'data', 'sample', 'service-areas.geojson')
  const geojsonPath = existsSync(seedPath) ? seedPath : samplePath

  console.log(
    `Using ${geojsonPath === seedPath ? 'seed' : 'sample'} data for service-areas.geojson`,
  )

  const raw = readFileSync(geojsonPath, 'utf-8')
  const geojson: GeoJsonCollection = JSON.parse(raw)

  console.log(`Parsed ${geojson.features.length} service area features`)

  await sql`TRUNCATE service_areas CASCADE`.execute(db)

  for (const feature of geojson.features) {
    const { CONTRACT_AREA_NUMBER, CONTRACT_AREA_NAME } = feature.properties
    const geomJson = JSON.stringify(feature.geometry)

    await sql`
      INSERT INTO service_areas (contract_area_number, name, geom)
      VALUES (
        ${CONTRACT_AREA_NUMBER},
        ${CONTRACT_AREA_NAME},
        ST_Multi(ST_GeomFromGeoJSON(${geomJson}))
      )
    `.execute(db)
  }

  const { count } = await db
    .selectFrom('service_areas')
    .select(db.fn.countAll<number>().as('count'))
    .executeTakeFirstOrThrow()

  console.log(`Inserted ${count} service areas`)
  await db.destroy()
}

seedServiceAreas().catch((err) => {
  console.error('Seed service areas failed:', err)
  db.destroy().then(() => process.exit(1))
})
