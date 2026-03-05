import type { HmcrSyncResponse } from '@schemas/incidents/hmcr-sync.schema.js'
import type { HmcrUpsertRow } from '@services/database/types/hmcr.js'
import { createServiceLogger } from '@utils/logger.js'
import type { FastifyBaseLogger, FastifyInstance } from 'fastify'

// HMCR API response types

interface HmcrFeatureProperties {
  WILDLIFE_RECORD_ID: number
  ACCIDENT_DATE: string | null
  TIME_OF_KILL: number | null
  LATITUDE: number | null
  LONGITUDE: number | null
  NEAREST_TOWN: string | null
  QUANTITY: number | null
  SPECIES: number | null
  SEX: string | null
  AGE: string | null
  COMMENT: string | null
}

interface HmcrGeoJsonResponse {
  type: string
  features: Array<{
    type: string
    properties: HmcrFeatureProperties
  }>
}

interface TokenResponse {
  access_token: string
  expires_in: number
}

// Fields we need from the HMCR wildlife report view
const PROPERTY_NAMES = [
  'WILDLIFE_RECORD_ID',
  'ACCIDENT_DATE',
  'TIME_OF_KILL',
  'LATITUDE',
  'LONGITUDE',
  'NEAREST_TOWN',
  'QUANTITY',
  'SPECIES',
  'SEX',
  'AGE',
  'COMMENT',
].join(',')

// HMCR species numeric codes -> species names
const HMCR_SPECIES_MAP: Record<number, string> = {
  1: 'Deer',
  2: 'Moose',
  3: 'Elk',
  4: 'Bear',
  5: 'Sheep',
  6: 'Caribou',
  7: 'Coyote',
  8: 'Porcupine',
  9: 'Cougar',
  10: 'Raccoon',
  11: 'Bobcat',
  12: 'Skunk',
  13: 'Wolf',
  14: 'Fox',
  15: 'Beaver',
  16: 'Horned Owl',
  17: 'Muskrat',
  18: 'Eagle',
  19: 'Buffalo',
  20: 'Badger',
  21: 'Possum',
  22: 'Otter',
  23: 'Lynx',
  24: 'Marten',
  25: 'Rabbit',
  26: 'Unknown', // "Other" in HMCR
  27: 'Unknown',
  28: 'White Tail Deer',
  29: 'Mule Deer',
  30: 'Black Bear',
  31: 'Grizzly Bear',
}

// HMCR time_of_kill numeric codes -> enum values
function parseTimeOfKill(code: number | null): string | null {
  if (code === null) return null
  switch (code) {
    case 1:
      return 'DAWN'
    case 2:
      return 'DUSK'
    case 3:
      return 'DAY'
    case 4:
      return 'DARK'
    case 5:
      return 'UNKNOWN'
    default:
      return 'UNKNOWN'
  }
}

// HMCR sex single-char codes -> enum values
function parseSex(raw: string | null): string | null {
  if (!raw) return null
  switch (raw.trim().toUpperCase()) {
    case 'F':
      return 'FEMALE'
    case 'M':
      return 'MALE'
    case 'U':
    case 'UNKN':
    case 'M/F':
      return 'UNKNOWN'
    default:
      return 'UNKNOWN'
  }
}

// HMCR age single-char codes -> enum values
function parseAge(raw: string | null): string | null {
  if (!raw) return null
  switch (raw.trim().toUpperCase()) {
    case 'A':
      return 'ADULT'
    case 'Y':
      return 'YOUNG'
    case 'U':
    case 'UNKN':
      return 'UNKNOWN'
    default:
      return 'UNKNOWN'
  }
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null
  // HMCR dates come as ISO strings like "2023-05-15T00:00:00Z" or "2023-05-15"
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

function parseComments(raw: string | null): string | null {
  if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'no comments')
    return null
  return raw.trim()
}

export class HmcrSyncService {
  private readonly log: FastifyBaseLogger
  private readonly fastify: FastifyInstance
  private readonly apiUrl: string
  private readonly tokenUrl: string
  private readonly clientId: string
  private readonly clientSecret: string
  private cachedToken: string | null = null
  private tokenExpiresAt = 0

  constructor(baseLog: FastifyBaseLogger, fastify: FastifyInstance) {
    this.log = createServiceLogger(baseLog, 'HMCR-SYNC')
    this.fastify = fastify
    this.apiUrl = fastify.config.hmcrApiUrl
    this.tokenUrl = fastify.config.hmcrTokenUrl
    this.clientId = fastify.config.hmcrId
    this.clientSecret = fastify.config.hmcrSecret
  }

  async sync(): Promise<HmcrSyncResponse> {
    const start = Date.now()

    // 1. Fetch all HMCR records
    const records = await this.fetchWildlifeRecords()

    // 2. Load species lookup from DB
    const speciesMap = await this.fastify.db.getSpeciesMap()
    const unknownId = speciesMap.get('unknown')
    if (unknownId === undefined) {
      throw new Error('Species "Unknown" not found in database')
    }

    // 3. Transform HMCR records to upsert rows
    let errors = 0
    const rows: HmcrUpsertRow[] = []

    for (const record of records) {
      const hmcrRecordId = record.WILDLIFE_RECORD_ID
      if (!hmcrRecordId || !Number.isInteger(hmcrRecordId)) {
        errors++
        continue
      }

      const accidentDate = parseDate(record.ACCIDENT_DATE)
      const year = accidentDate
        ? Number.parseInt(accidentDate.slice(0, 4), 10)
        : null
      if (!year) {
        this.log.warn({ hmcrRecordId }, 'skipping record with invalid date')
        errors++
        continue
      }

      // Resolve species from numeric code
      const speciesName =
        record.SPECIES !== null ? HMCR_SPECIES_MAP[record.SPECIES] : undefined
      const speciesId = speciesName
        ? (speciesMap.get(speciesName.toLowerCase()) ?? unknownId)
        : unknownId

      const quantity =
        record.QUANTITY !== null && record.QUANTITY > 0 ? record.QUANTITY : 1

      rows.push({
        hmcr_record_id: hmcrRecordId,
        accident_date: accidentDate,
        time_of_kill: parseTimeOfKill(record.TIME_OF_KILL),
        nearest_town: record.NEAREST_TOWN?.trim() || null,
        sex: parseSex(record.SEX),
        age: parseAge(record.AGE),
        comments: parseComments(record.COMMENT),
        quantity,
        latitude: record.LATITUDE,
        longitude: record.LONGITUDE,
        species_id: speciesId,
        year,
      })
    }

    this.log.info(
      { total: records.length, valid: rows.length, errors },
      'transformed HMCR records',
    )

    // 4. Upsert via database service
    const { created, updated } = await this.fastify.db.upsertHmcrIncidents(rows)
    const unchanged = rows.length - created - updated
    const durationMs = Date.now() - start

    this.log.info(
      { created, updated, unchanged, errors, durationMs },
      'HMCR sync complete',
    )

    return {
      created,
      updated,
      unchanged,
      totalFetched: records.length,
      errors,
      durationMs,
    }
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 30s buffer)
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 30_000) {
      return this.cachedToken
    }

    this.log.debug('requesting HMCR access token')

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    })

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HMCR token request failed (${response.status}): ${text}`)
    }

    const data = (await response.json()) as TokenResponse
    this.cachedToken = data.access_token
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000

    this.log.debug('HMCR access token acquired')
    return this.cachedToken
  }

  private async fetchWildlifeRecords(): Promise<HmcrFeatureProperties[]> {
    const token = await this.getAccessToken()

    const today = new Date().toISOString().slice(0, 10)
    const params = new URLSearchParams({
      typeName: 'hmr:HMR_WILDLIFE_REPORT_VW',
      propertyName: PROPERTY_NAMES,
      format: 'json',
      fromDate: '2018-01-01',
      toDate: today,
    })

    const url = `${this.apiUrl}/api/exports/report?${params}`
    this.log.info(
      { fromDate: '2018-01-01', toDate: today },
      'fetching HMCR wildlife records',
    )

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(120_000),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HMCR API request failed (${response.status}): ${text}`)
    }

    const data = (await response.json()) as HmcrGeoJsonResponse
    if (!Array.isArray(data.features)) {
      throw new Error(
        'HMCR API returned invalid response: missing features array',
      )
    }
    const records = data.features.map((f) => f.properties)

    this.log.info({ count: records.length }, 'fetched HMCR wildlife records')
    return records
  }
}
