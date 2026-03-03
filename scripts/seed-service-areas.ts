import { sql } from 'kysely'

import { createDatabase } from '../src/services/database/create-database.js'

const WFS_URL =
  'https://maps.th.gov.bc.ca/geoV05/hwy/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=hwy%3ADSA_CONTRACT_AREA&outputFormat=application%2Fjson'

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
  console.log('Fetching service areas from BC Gov WFS...')
  const response = await fetch(WFS_URL)
  if (!response.ok) {
    throw new Error(
      `WFS request failed: ${response.status} ${response.statusText}`,
    )
  }

  const geojson: GeoJsonCollection = await response.json()
  console.log(`Fetched ${geojson.features.length} service area features`)

  await sql`TRUNCATE service_areas CASCADE`.execute(db)
  await sql`ALTER TABLE service_areas DISABLE TRIGGER trg_simplify_service_areas`.execute(
    db,
  )
  await sql`ALTER TABLE service_areas DISABLE TRIGGER trg_reassign_incidents_on_boundary_change`.execute(
    db,
  )

  for (const feature of geojson.features) {
    const { CONTRACT_AREA_NUMBER, CONTRACT_AREA_NAME } = feature.properties
    const geomJson = JSON.stringify(feature.geometry)

    await sql`
      INSERT INTO service_areas (contract_area_number, name, geom)
      VALUES (
        ${CONTRACT_AREA_NUMBER},
        ${CONTRACT_AREA_NAME},
        ST_Transform(ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON(${geomJson})), 3005), 4326)
      )
    `.execute(db)
  }

  const { count } = await db
    .selectFrom('service_areas')
    .select(db.fn.countAll<number>().as('count'))
    .executeTakeFirstOrThrow()

  console.log(`Inserted ${count} service areas`)

  // The statement-level trigger fires per INSERT, but each fires before all rows
  // exist, so the coverage simplification won't be correct. Recompute once with
  // all rows present.
  console.log('Computing simplified geometries...')
  await sql`
    UPDATE service_areas sa
    SET geom_simplified = sub.geom_simplified
    FROM (
      SELECT id, ST_Transform(
        ST_SetSRID(ST_CoverageSimplify(ST_Transform(geom, 3005), 500) OVER (), 3005),
        4326
      ) AS geom_simplified
      FROM service_areas
    ) sub
    WHERE sa.id = sub.id
  `.execute(db)
  console.log('Simplified geometries computed')

  await sql`ALTER TABLE service_areas ENABLE TRIGGER trg_simplify_service_areas`.execute(
    db,
  )
  await sql`ALTER TABLE service_areas ENABLE TRIGGER trg_reassign_incidents_on_boundary_change`.execute(
    db,
  )

  await db.destroy()
}

seedServiceAreas().catch((err) => {
  console.error('Seed service areas failed:', err)
  db.destroy().then(() => process.exit(1))
})
