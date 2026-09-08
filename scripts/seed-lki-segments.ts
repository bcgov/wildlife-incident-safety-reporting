import type { Kysely } from 'kysely'
import { sql } from 'kysely'

import { createDatabase } from '../src/services/database/create-database.js'
import type { DB } from '../src/services/database/types/database.js'

const WFS_URL =
  'https://openmaps.gov.bc.ca/geo/pub/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=pub:WHSE_IMAGERY_AND_BASE_MAPS.MOT_LANDMARK_KM_INVENTORY_SP&outputFormat=application/json&srsName=EPSG:4326'

interface LkiFeature {
  type: 'Feature'
  properties: {
    CHRIS_LKI_SEGMENT_ID: number
    LKI_SEGMENT_NAME: string
    LKI_SEGMENT_DESCRIPTION: string | null
    LKI_SEGMENT_DIRECTION: string | null
    LKI_SEGMENT_LENGTH: number | null
    LKI_ROUTE_ID: string | null
    HIGHWAY_NUMBER: string | null
    FEATURE_LENGTH_M: number | null
    OBJECTID: number | null
  }
  geometry: {
    type: string
    coordinates: number[][]
  }
}

interface GeoJsonCollection {
  type: 'FeatureCollection'
  features: LkiFeature[]
}

export async function seedLkiSegments(db: Kysely<DB>): Promise<number> {
  console.log('Fetching LKI segments from BC Gov WFS...')
  const response = await fetch(WFS_URL, {
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) {
    throw new Error(
      `WFS request failed: ${response.status} ${response.statusText}`,
    )
  }

  const geojson = (await response.json()) as GeoJsonCollection
  console.log(`Fetched ${geojson.features.length} LKI segment features`)

  return await db.transaction().execute(async (trx) => {
    await sql`TRUNCATE lki_segments CASCADE`.execute(trx)
    await sql`ALTER TABLE lki_segments DISABLE TRIGGER trg_reassign_incidents_on_lki_change`.execute(
      trx,
    )

    const BATCH_SIZE = 100
    const totalBatches = Math.ceil(geojson.features.length / BATCH_SIZE)

    for (let i = 0; i < geojson.features.length; i += BATCH_SIZE) {
      const batch = geojson.features.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1

      await trx
        .insertInto('lki_segments')
        .values(
          batch.map((f) => ({
            chris_lki_segment_id: f.properties.CHRIS_LKI_SEGMENT_ID,
            lki_segment_name: f.properties.LKI_SEGMENT_NAME,
            lki_segment_description: f.properties.LKI_SEGMENT_DESCRIPTION,
            lki_segment_direction: f.properties.LKI_SEGMENT_DIRECTION,
            lki_segment_length: f.properties.LKI_SEGMENT_LENGTH
              ? String(f.properties.LKI_SEGMENT_LENGTH)
              : null,
            lki_route_id: f.properties.LKI_ROUTE_ID,
            highway_number: f.properties.HIGHWAY_NUMBER,
            geom: sql`ST_GeomFromGeoJSON(${JSON.stringify(f.geometry)})`,
            feature_length_m: f.properties.FEATURE_LENGTH_M
              ? String(f.properties.FEATURE_LENGTH_M)
              : null,
            objectid: f.properties.OBJECTID,
          })),
        )
        .execute()

      if (batchNum % 5 === 0 || batchNum === totalBatches) {
        console.log(`  Batch ${batchNum}/${totalBatches} complete`)
      }
    }

    const { count } = await trx
      .selectFrom('lki_segments')
      .select(trx.fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow()

    console.log(`Inserted ${count} LKI segments`)

    await sql`ALTER TABLE lki_segments ENABLE TRIGGER trg_reassign_incidents_on_lki_change`.execute(
      trx,
    )

    return Number(count)
  })
}

if (import.meta.main) {
  const db = createDatabase()
  try {
    await seedLkiSegments(db)
    await db.destroy()
    process.exit(0)
  } catch (err) {
    console.error('Seed LKI segments failed:', err)
    await db.destroy().catch(() => {})
    process.exit(1)
  }
}
