import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { S3Client } from 'bun'
import { sql, type Transaction } from 'kysely'
import Papa from 'papaparse'

import { createDatabase } from '../src/services/database/create-database.js'
import type { DB } from '../src/services/database/types/database.js'
import { seedLkiSegments } from './seed-lki-segments.js'
import { seedServiceAreas } from './seed-service-areas.js'

const COPY_COLUMNS = [
  'latitude',
  'longitude',
  'year',
  'accident_date',
  'time_of_kill',
  'nearest_town',
  'sex',
  'age',
  'comments',
  'quantity',
  'species_id',
  'hmcr_record_id',
] as const

const INCIDENT_INDEXES = [
  {
    name: 'idx_incidents_geom',
    ddl: 'CREATE INDEX idx_incidents_geom ON incidents USING gist (geom)',
  },
  {
    name: 'idx_incidents_species_id',
    ddl: 'CREATE INDEX idx_incidents_species_id ON incidents (species_id)',
  },
  {
    name: 'idx_incidents_service_area_id',
    ddl: 'CREATE INDEX idx_incidents_service_area_id ON incidents (service_area_id)',
  },
  {
    name: 'idx_incidents_year_species',
    ddl: 'CREATE INDEX idx_incidents_year_species ON incidents (year, species_id)',
  },
  {
    name: 'idx_incidents_lki_segment_id',
    ddl: 'CREATE INDEX idx_incidents_lki_segment_id ON incidents (lki_segment_id)',
  },
] as const

const DRY_RUN = process.argv.includes('--dry-run')
const db = createDatabase({ max: 1 })

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
  hmcr_record_id: number | null
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

// Numeric codes from HMCR that appear in historical CSV data
const TIME_OF_KILL_CODES: Record<string, string> = {
  '1': 'DAWN',
  '2': 'DUSK',
  '3': 'DAY',
  '4': 'DARK',
  '5': 'UNKNOWN',
}

// Single-char and variant sex codes from historical CSV data
const SEX_CODES: Record<string, string> = {
  F: 'FEMALE',
  M: 'MALE',
  U: 'UNKNOWN',
}

// Single-char age codes and descriptive values from historical CSV data
const AGE_CODES: Record<string, string> = {
  A: 'ADULT',
  Y: 'YOUNG',
  U: 'UNKNOWN',
}

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

    const exactId = speciesMap.get(lower)
    if (exactId !== undefined) {
      return {
        speciesId: exactId,
        speciesName: rawSpecies.trim(),
        method: 'exact',
      }
    }

    return { speciesId: unknownId, speciesName: 'Unknown', method: 'unknown' }
  }
}

function parseDate(raw: string): string | null {
  if (!raw || raw.trim() === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim()
  return null
}

function parseTimeOfKill(raw: string): string | null {
  if (!raw || raw.trim() === '') return null
  const upper = raw.trim().toUpperCase()
  if (VALID_TIME_OF_KILL.has(upper)) return upper
  return TIME_OF_KILL_CODES[raw.trim()] ?? 'UNKNOWN'
}

function parseSex(raw: string): string | null {
  if (!raw || raw.trim() === '') return null
  const upper = raw.trim().toUpperCase()
  if (VALID_SEX.has(upper)) return upper
  return SEX_CODES[upper] ?? 'UNKNOWN'
}

function parseAge(raw: string): string | null {
  if (!raw || raw.trim() === '') return null
  const upper = raw.trim().toUpperCase()
  if (VALID_AGE.has(upper)) return upper
  return AGE_CODES[upper] ?? 'UNKNOWN'
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

async function downloadFromS3(filename: string): Promise<string | null> {
  const bucket = process.env.S3_BUCKET
  const accessKeyId = process.env.S3_ACCESS_KEY
  const secretAccessKey = process.env.S3_SECRET_KEY
  const endpoint = process.env.S3_ENDPOINT_URL
  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) return null

  const objectKey = process.env.S3_OBJECT_KEY ?? filename
  const tmpPath = path.join(os.tmpdir(), filename)

  console.log(
    `Downloading seed data for ${filename} from s3://${bucket}/${objectKey}`,
  )
  const client = new S3Client({
    accessKeyId,
    secretAccessKey,
    endpoint,
    bucket,
  })
  const buffer = Buffer.from(await client.file(objectKey).arrayBuffer())
  writeFileSync(tmpPath, buffer)
  console.log(`Downloaded ${buffer.byteLength} bytes to ${tmpPath}`)
  return tmpPath
}

async function resolveDataFile(
  root: string,
  filename: string,
): Promise<string> {
  const s3Path = await downloadFromS3(filename)
  if (s3Path) return s3Path

  const url = process.env.WARS_SEED_URL
  if (url) {
    const tmpPath = path.join(os.tmpdir(), filename)
    console.log(`Downloading seed data for ${filename} from WARS_SEED_URL`)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(
        `Seed download failed: ${response.status} ${response.statusText}`,
      )
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    writeFileSync(tmpPath, buffer)
    console.log(`Downloaded ${buffer.byteLength} bytes to ${tmpPath}`)
    return tmpPath
  }

  const seedPath = path.join(root, 'data', 'seed', filename)
  const samplePath = path.join(root, 'data', 'sample', filename)
  const resolved = existsSync(seedPath) ? seedPath : samplePath
  console.log(
    `Using ${resolved === seedPath ? 'seed' : 'sample'} data for ${filename}`,
  )
  return resolved
}

function buildPsqlEnv(): Record<string, string> {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
  }
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL)
    env.PGHOST = url.hostname
    if (url.port) env.PGPORT = url.port
    if (url.username) env.PGUSER = decodeURIComponent(url.username)
    if (url.password) env.PGPASSWORD = decodeURIComponent(url.password)
    const db = url.pathname.replace(/^\//, '')
    if (db) env.PGDATABASE = db
    const sslmode = url.searchParams.get('sslmode')
    if (sslmode) env.PGSSLMODE = sslmode
  } else {
    if (process.env.DB_HOST) env.PGHOST = process.env.DB_HOST
    if (process.env.DB_PORT) env.PGPORT = process.env.DB_PORT
    if (process.env.DB_USER) env.PGUSER = process.env.DB_USER
    if (process.env.DB_PASSWORD) env.PGPASSWORD = process.env.DB_PASSWORD
    if (process.env.DB_NAME) env.PGDATABASE = process.env.DB_NAME
  }
  if (process.env.PGSSLMODE) env.PGSSLMODE = process.env.PGSSLMODE
  return env
}

function escapeTsv(value: string | null): string {
  if (value === null) return '\\N'
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

function formatNumeric(value: number | null): string {
  return value === null ? '\\N' : String(value)
}

function rowToTsv(r: InsertRow): string {
  return `${[
    formatNumeric(r.latitude),
    formatNumeric(r.longitude),
    String(r.year),
    escapeTsv(r.accident_date),
    escapeTsv(r.time_of_kill),
    escapeTsv(r.nearest_town),
    escapeTsv(r.sex),
    escapeTsv(r.age),
    escapeTsv(r.comments),
    String(r.quantity),
    String(r.species_id),
    formatNumeric(r.hmcr_record_id),
  ].join('\t')}\n`
}

function qIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

async function copyIncidents(rows: InsertRow[]): Promise<void> {
  const cols = COPY_COLUMNS.map(qIdent).join(', ')
  const copyCmd = `\\COPY ${qIdent('incidents')} (${cols}) FROM STDIN WITH (FORMAT text, DELIMITER E'\\t', NULL '\\N')`

  const proc = Bun.spawn(['psql', '-c', copyCmd], {
    stdin: 'pipe',
    stdout: 'ignore',
    stderr: 'pipe',
    env: buildPsqlEnv(),
  })

  for (const row of rows) {
    proc.stdin.write(rowToTsv(row))
  }
  proc.stdin.end()

  const [exit, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stderr).text(),
  ])

  if (exit !== 0) {
    throw new Error(
      `psql COPY failed (exit ${exit}): ${stderr.trim() || '<no stderr>'}`,
    )
  }
}

async function bulkLoadIncidents(rows: InsertRow[]): Promise<void> {
  await sql`ALTER TABLE incidents SET UNLOGGED`.execute(db)

  for (const idx of INCIDENT_INDEXES) {
    await sql.raw(`DROP INDEX IF EXISTS ${idx.name}`).execute(db)
  }

  await sql`ALTER TABLE incidents DISABLE TRIGGER trg_incidents_geom`.execute(
    db,
  )
  await sql`ALTER TABLE incidents DISABLE TRIGGER trg_incidents_lki_assign`.execute(
    db,
  )

  console.log(`\nStreaming ${rows.length} rows via psql \\COPY...`)
  const copyStart = Date.now()
  await copyIncidents(rows)
  console.log(
    `  COPY complete in ${((Date.now() - copyStart) / 1000).toFixed(1)}s`,
  )

  // Post-COPY work in a transaction so a mid-flow failure rolls back atomically;
  // the COPY itself runs through a separate psql subprocess and can't participate.
  await db.transaction().execute(async (trx) => {
    console.log('Computing geom from lat/lng...')
    await sql`
      UPDATE incidents
      SET geom = ST_SetSRID(ST_MakePoint(longitude::float8, latitude::float8), 4326)
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `.execute(trx)

    await runSpatialJoin(trx)
    await runLkiAssignment(trx)

    await sql`ALTER TABLE incidents ENABLE TRIGGER trg_incidents_lki_assign`.execute(
      trx,
    )
    await sql`ALTER TABLE incidents ENABLE TRIGGER trg_incidents_geom`.execute(
      trx,
    )

    console.log('\nRecreating indexes...')
    for (const idx of INCIDENT_INDEXES) {
      await sql.raw(idx.ddl).execute(trx)
    }

    console.log('Restoring LOGGED state...')
    await sql`ALTER TABLE incidents SET LOGGED`.execute(trx)
  })
}

async function runSpatialJoin(executor: Transaction<DB>): Promise<void> {
  if (DRY_RUN) return

  const result = await sql<{ matched: number }>`
    WITH updated AS (
      UPDATE incidents wi
      SET service_area_id = sa.id
      FROM service_areas sa
      WHERE wi.geom IS NOT NULL
        AND ST_Contains(sa.geom, wi.geom)
      RETURNING wi.id
    )
    SELECT count(*)::int AS matched FROM updated
  `.execute(executor)

  const matched = result.rows[0].matched

  const { total } = await executor
    .selectFrom('incidents')
    .select(executor.fn.countAll<number>().as('total'))
    .executeTakeFirstOrThrow()

  const { no_coords } = await executor
    .selectFrom('incidents')
    .select(executor.fn.count<number>('id').as('no_coords'))
    .where('geom', 'is', null)
    .executeTakeFirstOrThrow()

  const unmatched = Number(total) - matched - Number(no_coords)

  console.log('\n--- Spatial Join (Service Areas) ---')
  console.log(`Matched to service area: ${matched}`)
  console.log(`No coordinates (null geom): ${no_coords}`)
  if (unmatched > 0) {
    console.log(`Has coords but outside all polygons: ${unmatched}`)
  }
}

async function runLkiAssignment(executor: Transaction<DB>): Promise<void> {
  if (DRY_RUN) return

  const result = await sql<{ matched: number }>`
    WITH updated AS (
      UPDATE incidents wi
      SET lki_segment_id = sub.nearest_id
      FROM (
        SELECT wi2.id, nearest.chris_lki_segment_id AS nearest_id
        FROM incidents wi2
        CROSS JOIN LATERAL (
          SELECT chris_lki_segment_id, geom
          FROM lki_segments
          ORDER BY geom <-> wi2.geom
          LIMIT 1
        ) nearest
        WHERE wi2.geom IS NOT NULL
          AND ST_DWithin(geography(nearest.geom), geography(wi2.geom), 200)
      ) sub
      WHERE wi.id = sub.id
      RETURNING wi.id
    )
    SELECT count(*)::int AS matched FROM updated
  `.execute(executor)

  const matched = result.rows[0].matched

  const { total } = await executor
    .selectFrom('incidents')
    .select(executor.fn.countAll<number>().as('total'))
    .executeTakeFirstOrThrow()

  const { no_coords } = await executor
    .selectFrom('incidents')
    .select(executor.fn.count<number>('id').as('no_coords'))
    .where('geom', 'is', null)
    .executeTakeFirstOrThrow()

  const unmatched = Number(total) - matched - Number(no_coords)

  console.log('\n--- Spatial Join (LKI Segments) ---')
  console.log(`Matched to LKI segment: ${matched}`)
  console.log(`No coordinates (null geom): ${no_coords}`)
  if (unmatched > 0) {
    console.log(`Has coords but outside 200m of any segment: ${unmatched}`)
  }
}

async function seed() {
  console.log(DRY_RUN ? '=== DRY RUN (no DB writes) ===' : '=== SEED ===')

  if (!DRY_RUN) {
    const { count } = await db
      .selectFrom('incidents')
      .select(db.fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow()

    if (Number(count) > 0) {
      console.log(
        `Skipping seed: ${count} incidents already loaded. Truncate the table to re-seed.`,
      )
      await db.destroy()
      return
    }
  }

  const root = path.resolve(import.meta.dir, '..')

  console.log('\n--- Service Areas ---')
  if (!DRY_RUN) {
    await seedServiceAreas(db)
  }

  console.log('\n--- LKI Segments ---')
  if (!DRY_RUN) {
    await seedLkiSegments(db)
  }

  const speciesRows = await db.selectFrom('species').selectAll().execute()
  const speciesMap = new Map<string, number>()
  for (const row of speciesRows) {
    speciesMap.set(row.name.toLowerCase(), row.id)
  }
  console.log(`\nLoaded ${speciesRows.length} species from DB`)

  const match = buildMatcher(speciesMap)

  const csvPath = await resolveDataFile(
    root,
    process.env.WARS_SEED_FILE ?? 'WARs.csv',
  )
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

    const hmcrId = row['Data.Set'] === 'Current' ? parseIntOrNull(row.ID) : null

    insertRows.push({
      accident_date: parseDate(row['Accident.Date']),
      time_of_kill: parseTimeOfKill(row['Time.of.Kill']),
      nearest_town: row['Nearest.Town']?.trim() || null,
      sex: parseSex(row.Sex),
      age: parseAge(row.Age),
      comments,
      quantity: parseQuantity(row.Quantity),
      latitude: parseFloatOrNull(row.Latitude),
      longitude: parseFloatOrNull(row.Longitude),
      species_id: result.speciesId,
      year,
      hmcr_record_id: hmcrId,
    })
  }

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

  if (!DRY_RUN) {
    await bulkLoadIncidents(insertRows)

    const { count } = await db
      .selectFrom('incidents')
      .select(db.fn.countAll<number>().as('count'))
      .executeTakeFirstOrThrow()

    console.log(`\nInserted ${count} incidents`)
  }

  console.log('\n=== SEED COMPLETE ===')
  await db.destroy()
}

try {
  await seed()
  process.exit(0)
} catch (err) {
  console.error('Seed failed:', err)
  await db.destroy().catch(() => {})
  process.exit(1)
}
