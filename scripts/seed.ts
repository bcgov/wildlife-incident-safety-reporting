import { existsSync, readFileSync } from 'node:fs'
import * as path from 'node:path'
import { sql } from 'kysely'
import Papa from 'papaparse'

import { createDatabase } from '../src/services/database/create-database.js'
import type {
  Age,
  Sex,
  TimeOfKill,
} from '../src/services/database/types/database.js'

const DRY_RUN = process.argv.includes('--dry-run')
const db = createDatabase()

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

interface CsvRow {
  'Accident.Date': string
  'Time.of.Kill': string
  'Nearest.Town': string
  Sex: string
  Age: string
  Comments: string
  Quantity: string
  'Service.Area': string
  Latitude: string
  Longitude: string
  Species: string
  ID: string
  'Data.Set': string
  Year: string
}

interface InsertRow {
  accident_date: string | null
  time_of_kill: string | null
  nearest_town: string | null
  sex: string | null
  age: string | null
  comments: string | null
  quantity: number
  latitude: number | null
  longitude: number | null
  species_id: number
  year: number
}

type MatchMethod = 'exact' | 'override' | 'unknown'

interface MatchResult {
  speciesId: number
  speciesName: string
  method: MatchMethod
}

const VALID_TIME_OF_KILL = new Set(['DAWN', 'DUSK', 'DAY', 'DARK', 'UNKNOWN'])
const VALID_SEX = new Set(['MALE', 'FEMALE', 'UNKNOWN'])
const VALID_AGE = new Set(['YOUNG', 'ADULT', 'UNKNOWN'])

// Lowercase key -> canonical species name
const OVERRIDES: Record<string, string> = {
  '': 'Unknown',
  other: 'Unknown',
  racoon: 'Raccoon',
  'bald eagle': 'Eagle',
  martin: 'Marten',
  owl: 'Horned Owl',
  cat: 'Unknown',
  'house cat': 'Unknown',
  'domestic cow': 'Unknown',
  dog: 'Unknown',
  goose: 'Unknown',
  mink: 'Unknown',
  seagull: 'Unknown',
  squirrel: 'Unknown',
  turkey: 'Unknown',
}

function buildMatcher(speciesMap: Map<string, number>) {
  const unknownId = speciesMap.get('unknown')
  if (unknownId === undefined) {
    throw new Error('Species "Unknown" not found in database')
  }

  return function match(rawSpecies: string): MatchResult {
    const lower = rawSpecies.trim().toLowerCase()

    // Explicit overrides
    if (lower in OVERRIDES) {
      const target = OVERRIDES[lower].toLowerCase()
      const id = speciesMap.get(target)
      if (id !== undefined) {
        return {
          speciesId: id,
          speciesName: OVERRIDES[lower],
          method: 'override',
        }
      }
    }

    // Case-insensitive exact match
    const exactId = speciesMap.get(lower)
    if (exactId !== undefined) {
      return {
        speciesId: exactId,
        speciesName: rawSpecies.trim(),
        method: 'exact',
      }
    }

    // Anything else -> Unknown
    return { speciesId: unknownId, speciesName: 'Unknown', method: 'unknown' }
  }
}

function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim()
  return null
}

function parseEnum<T extends string>(
  raw: string,
  valid: Set<string>,
): T | null {
  const upper = raw.trim().toUpperCase()
  if (valid.has(upper)) return upper as T
  return null
}

function parseIntOrNull(raw: string): number | null {
  const n = Number.parseInt(raw, 10)
  return Number.isNaN(n) ? null : n
}

function parseFloatOrNull(raw: string): number | null {
  const n = Number.parseFloat(raw)
  return Number.isNaN(n) ? null : n
}

function parseQuantity(raw: string): number {
  const n = parseIntOrNull(raw)
  return n !== null && n > 0 ? n : 1
}

function parseComments(raw: string): string | null {
  if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'no comments')
    return null
  return raw.trim()
}

function resolveDataFile(root: string, filename: string): string {
  const seedPath = path.join(root, 'data', 'seed', filename)
  const samplePath = path.join(root, 'data', 'sample', filename)
  const resolved = existsSync(seedPath) ? seedPath : samplePath
  console.log(
    `Using ${resolved === seedPath ? 'seed' : 'sample'} data for ${filename}`,
  )
  return resolved
}

async function seedServiceAreas(root: string): Promise<number> {
  const geojsonPath = resolveDataFile(root, 'service-areas.geojson')
  const raw = readFileSync(geojsonPath, 'utf-8')
  const geojson: GeoJsonCollection = JSON.parse(raw)

  console.log(`Parsed ${geojson.features.length} service area features`)

  if (!DRY_RUN) {
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
    return Number(count)
  }

  return geojson.features.length
}

async function runSpatialJoin(): Promise<void> {
  if (DRY_RUN) return

  const result = await sql<{ matched: number }>`
    WITH updated AS (
      UPDATE wars_incidents wi
      SET service_area_id = sa.id
      FROM service_areas sa
      WHERE wi.geom IS NOT NULL
        AND ST_Contains(sa.geom, wi.geom)
      RETURNING wi.id
    )
    SELECT count(*)::int AS matched FROM updated
  `.execute(db)

  const matched = result.rows[0].matched

  const { total } = await db
    .selectFrom('wars_incidents')
    .select(db.fn.countAll<number>().as('total'))
    .executeTakeFirstOrThrow()

  const { no_coords } = await db
    .selectFrom('wars_incidents')
    .select(db.fn.count<number>('id').as('no_coords'))
    .where('geom', 'is', null)
    .executeTakeFirstOrThrow()

  const unmatched = Number(total) - matched - Number(no_coords)

  console.log('\n--- Spatial Join ---')
  console.log(`Matched to service area: ${matched}`)
  console.log(`No coordinates (null geom): ${no_coords}`)
  if (unmatched > 0) {
    console.log(`Has coords but outside all polygons: ${unmatched}`)
  }
}

async function seed() {
  console.log(DRY_RUN ? '=== DRY RUN (no DB writes) ===' : '=== SEED ===')

  const root = path.resolve(import.meta.dir, '..')

  // 1. Seed service areas from GeoJSON
  console.log('\n--- Service Areas ---')
  await seedServiceAreas(root)

  // 2. Load species lookup from DB
  const speciesRows = await db.selectFrom('species').selectAll().execute()
  const speciesMap = new Map<string, number>()
  for (const row of speciesRows) {
    speciesMap.set(row.name.toLowerCase(), row.id)
  }
  console.log(`\nLoaded ${speciesRows.length} species from DB`)

  const match = buildMatcher(speciesMap)

  // 3. Parse CSV
  const csvPath = resolveDataFile(root, 'WARs.csv')
  const csvText = readFileSync(csvPath, 'utf-8')
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    console.warn(`CSV parse warnings: ${parsed.errors.length}`)
    for (const err of parsed.errors.slice(0, 10)) {
      console.warn(`  Row ${err.row}: ${err.message}`)
    }
  }

  const rows = parsed.data
  console.log(`Parsed ${rows.length} CSV rows`)

  // Process rows
  const stats = {
    exact: 0,
    override: 0,
    unknown: 0,
    missingYear: 0,
  }
  const overrideDetails = new Map<string, { target: string; count: number }>()
  const unknownDetails = new Map<string, number>()
  const insertRows: InsertRow[] = []

  for (const row of rows) {
    const year = parseIntOrNull(row.Year)
    if (year === null) {
      stats.missingYear++
      continue
    }

    const comments = parseComments(row.Comments)
    const result = match(row.Species)
    stats[result.method]++

    if (result.method === 'override') {
      const key = `${row.Species.trim()} -> ${result.speciesName}`
      const existing = overrideDetails.get(key)
      if (existing) {
        existing.count++
      } else {
        overrideDetails.set(key, { target: result.speciesName, count: 1 })
      }
    } else if (result.method === 'unknown') {
      const raw = row.Species.trim() || '(empty)'
      unknownDetails.set(raw, (unknownDetails.get(raw) || 0) + 1)
    }

    insertRows.push({
      accident_date: parseDate(row['Accident.Date']),
      time_of_kill: parseEnum(row['Time.of.Kill'], VALID_TIME_OF_KILL),
      nearest_town: row['Nearest.Town']?.trim() || null,
      sex: parseEnum(row.Sex, VALID_SEX),
      age: parseEnum(row.Age, VALID_AGE),
      comments,
      quantity: parseQuantity(row.Quantity),
      latitude: parseFloatOrNull(row.Latitude),
      longitude: parseFloatOrNull(row.Longitude),
      species_id: result.speciesId,
      year,
    })
  }

  // Print report
  console.log('\n--- Matching Report ---')
  console.log(`Exact matches:    ${stats.exact}`)
  console.log(`Override matches: ${stats.override}`)
  console.log(`Unknown:          ${stats.unknown}`)
  console.log(`Skipped (no year): ${stats.missingYear}`)

  if (overrideDetails.size > 0) {
    console.log('\n  Override details:')
    for (const [key, val] of [...overrideDetails].sort(
      (a, b) => b[1].count - a[1].count,
    )) {
      console.log(`    ${key} (${val.count} rows)`)
    }
  }

  if (unknownDetails.size > 0) {
    console.log('\n  Unknown details:')
    for (const [key, count] of [...unknownDetails].sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`    "${key}" (${count} rows)`)
    }
  }

  console.log(`\nTotal rows to insert: ${insertRows.length}`)

  // 4. Insert incidents
  if (!DRY_RUN) {
    const BATCH_SIZE = 1000
    const totalBatches = Math.ceil(insertRows.length / BATCH_SIZE)

    console.log(
      `\nInserting ${insertRows.length} rows in ${totalBatches} batches...`,
    )

    await db.transaction().execute(async (trx) => {
      for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
        const batch = insertRows.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1

        await trx
          .insertInto('wars_incidents')
          .values(
            batch.map((r) => ({
              accident_date: r.accident_date
                ? sql<Date>`${r.accident_date}::date`
                : null,
              time_of_kill: r.time_of_kill
                ? sql<TimeOfKill>`${r.time_of_kill}::time_of_kill`
                : null,
              nearest_town: r.nearest_town,
              sex: r.sex ? sql<Sex>`${r.sex}::sex` : null,
              age: r.age ? sql<Age>`${r.age}::age` : null,
              comments: r.comments,
              quantity: r.quantity,
              latitude: r.latitude,
              longitude: r.longitude,
              species_id: r.species_id,
              year: r.year,
            })),
          )
          .execute()

        if (batchNum % 20 === 0 || batchNum === totalBatches) {
          console.log(`  Batch ${batchNum}/${totalBatches} complete`)
        }
      }
    })

    const { count } = await db
      .selectFrom('wars_incidents')
      .select(db.fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow()

    console.log(`\nInserted ${count} incidents`)

    // 5. Spatial join - assign service areas
    await runSpatialJoin()
  }

  console.log('\n=== SEED COMPLETE ===')
  await db.destroy()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  db.destroy().then(() => process.exit(1))
})
