import type { DensityResponse } from '@schemas/incidents/density.schema.js'
import type { LkiSegmentsResponse } from '@schemas/lki/segments.schema.js'
import type { FastifyInstance } from 'fastify'
import { sql } from 'kysely'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import { idirToken } from '../helpers/auth.js'
import { getTestDatabase, resetDatabase } from '../helpers/database.js'

const YEAR = 2021
const SEGMENT_ID = 9001
const SEGMENTS_URL = '/v1/lki/segments'
const COORDINATES = [
  [-123.36, 48.42],
  [-123.34, 48.44],
]

describe('LKI Segments', () => {
  let app: FastifyInstance
  let speciesId: number

  beforeAll(async () => {
    app = await build()
    await app.ready()

    const species = await getTestDatabase()
      .selectFrom('species')
      .select('id')
      .orderBy('id')
      .executeTakeFirstOrThrow()
    speciesId = species.id
  })

  afterAll(async () => {
    await app?.close()
  })

  beforeEach(async () => {
    await resetDatabase()
    app.responseCache.clear()

    await getTestDatabase()
      .insertInto('lki_segments')
      .values({
        chris_lki_segment_id: SEGMENT_ID,
        lki_segment_name: 'Test Segment',
        highway_number: '1',
        lki_segment_length: '12.5',
        geom: sql`ST_GeomFromGeoJSON(${JSON.stringify({
          type: 'LineString',
          coordinates: COORDINATES,
        })})`,
      })
      .execute()

    await getTestDatabase()
      .insertInto('incidents')
      .values({
        year: YEAR,
        species_id: speciesId,
        latitude: '48.43',
        longitude: '-123.35',
        lki_segment_id: SEGMENT_ID,
      })
      .execute()
  })

  const headers = (encoding = 'identity') => ({
    authorization: `Bearer ${idirToken()}`,
    'accept-encoding': encoding,
  })

  it('returns every segment with its geometry', async () => {
    const res = await app.inject({
      method: 'GET',
      url: SEGMENTS_URL,
      headers: headers(),
    })

    expect(res.statusCode).toBe(200)
    const segment = res
      .json<LkiSegmentsResponse>()
      .find((item) => item.segmentId === SEGMENT_ID)
    expect(segment).toMatchObject({
      segmentName: 'Test Segment',
      highwayNumber: '1',
      segmentLengthKm: 12.5,
      geometry: { type: 'LineString', coordinates: COORDINATES },
    })
  })

  it('density rows carry no geometry', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/incidents/density?year=${YEAR}`,
      headers: headers(),
    })

    expect(res.statusCode).toBe(200)
    const row = res
      .json<DensityResponse>()
      .find((item) => item.segmentId === SEGMENT_ID)
    expect(row?.totalAnimals).toBe(1)
    expect(row && Object.hasOwn(row, 'geometry')).toBe(false)
  })

  it('revalidates segments with the generation tag', async () => {
    const first = await app.inject({
      method: 'GET',
      url: SEGMENTS_URL,
      headers: headers('gzip'),
    })
    expect(first.statusCode).toBe(200)
    expect(first.headers.etag).toBeDefined()

    const res = await app.inject({
      method: 'GET',
      url: SEGMENTS_URL,
      headers: {
        ...headers('gzip'),
        'if-none-match': String(first.headers.etag),
      },
    })

    expect(res.statusCode).toBe(304)
    expect(res.payload).toBe('')
  })

  it('requires a token', async () => {
    const res = await app.inject({ method: 'GET', url: SEGMENTS_URL })

    expect(res.statusCode).toBe(401)
  })
})
