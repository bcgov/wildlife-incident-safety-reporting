import type { Kysely } from 'kysely'
import { sql } from 'kysely'

import { createDatabase } from '../src/services/database/create-database.js'
import type { DB } from '../src/services/database/types/database.js'

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

const DISTRICT_REGION_MAP: Record<
  number,
  { district: string; region: string }
> = {
  1: { district: 'Vancouver Island', region: 'South Coast' },
  2: { district: 'Vancouver Island', region: 'South Coast' },
  3: { district: 'Vancouver Island', region: 'South Coast' },
  4: { district: 'Lower Mainland', region: 'South Coast' },
  5: { district: 'Lower Mainland', region: 'South Coast' },
  6: { district: 'Lower Mainland', region: 'South Coast' },
  7: { district: 'Lower Mainland', region: 'South Coast' },
  8: { district: 'Okanagan-Shuswap', region: 'Southern Interior' },
  9: { district: 'West Kootenay', region: 'Southern Interior' },
  10: { district: 'West Kootenay', region: 'Southern Interior' },
  11: { district: 'Rocky Mountain', region: 'Southern Interior' },
  12: { district: 'Rocky Mountain', region: 'Southern Interior' },
  13: { district: 'Okanagan-Shuswap', region: 'Southern Interior' },
  14: { district: 'Thompson-Nicola', region: 'Southern Interior' },
  15: { district: 'Thompson-Nicola', region: 'Southern Interior' },
  16: { district: 'Cariboo', region: 'Southern Interior' },
  17: { district: 'Cariboo', region: 'Southern Interior' },
  18: { district: 'Cariboo', region: 'Southern Interior' },
  19: { district: 'Fort George', region: 'Northern' },
  20: { district: 'Fort George', region: 'Northern' },
  21: { district: 'Peace', region: 'Northern' },
  22: { district: 'Peace', region: 'Northern' },
  23: { district: 'Fort George', region: 'Northern' },
  24: { district: 'Bulkley-Stikine', region: 'Northern' },
  25: { district: 'Bulkley-Stikine', region: 'Northern' },
  26: { district: 'Skeena', region: 'Northern' },
  27: { district: 'Skeena', region: 'Northern' },
  28: { district: 'Bulkley-Stikine', region: 'Northern' },
}

export async function seedServiceAreas(db: Kysely<DB>): Promise<number> {
  console.log('Fetching service areas from BC Gov WFS...')
  const response = await fetch(WFS_URL)
  if (!response.ok) {
    throw new Error(
      `WFS request failed: ${response.status} ${response.statusText}`,
    )
  }

  const geojson: GeoJsonCollection = await response.json()
  console.log(`Fetched ${geojson.features.length} service area features`)

  return await db.transaction().execute(async (trx) => {
    await sql`TRUNCATE service_areas CASCADE`.execute(trx)
    await sql`ALTER TABLE service_areas DISABLE TRIGGER trg_simplify_service_areas`.execute(
      trx,
    )
    await sql`ALTER TABLE service_areas DISABLE TRIGGER trg_reassign_incidents_on_boundary_change`.execute(
      trx,
    )

    for (const feature of geojson.features) {
      const { CONTRACT_AREA_NUMBER, CONTRACT_AREA_NAME } = feature.properties
      const geomJson = JSON.stringify(feature.geometry)
      const mapping = DISTRICT_REGION_MAP[CONTRACT_AREA_NUMBER]
      if (!mapping) {
        throw new Error(
          `No district/region mapping for contract area ${CONTRACT_AREA_NUMBER}`,
        )
      }

      await sql`
        INSERT INTO service_areas (contract_area_number, name, district, region, geom)
        VALUES (
          ${CONTRACT_AREA_NUMBER},
          ${CONTRACT_AREA_NAME},
          ${mapping.district},
          ${mapping.region},
          ST_Transform(ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON(${geomJson})), 3005), 4326)
        )
      `.execute(trx)
    }

    const { count } = await trx
      .selectFrom('service_areas')
      .select(trx.fn.countAll<number>().as('count'))
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
    `.execute(trx)
    console.log('Simplified geometries computed')

    await sql`ALTER TABLE service_areas ENABLE TRIGGER trg_simplify_service_areas`.execute(
      trx,
    )
    await sql`ALTER TABLE service_areas ENABLE TRIGGER trg_reassign_incidents_on_boundary_change`.execute(
      trx,
    )

    return Number(count)
  })
}

// Run standalone when executed directly
if (import.meta.main) {
  const db = createDatabase()
  try {
    await seedServiceAreas(db)
    await db.destroy()
    process.exit(0)
  } catch (err) {
    console.error('Seed service areas failed:', err)
    await db.destroy().catch(() => {})
    process.exit(1)
  }
}
