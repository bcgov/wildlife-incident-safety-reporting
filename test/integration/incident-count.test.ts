import { MAX_SELECTED_YEARS } from '@schemas/common/incident-query.schema.js'
import type {
  IncidentCountResponse,
  IncidentsResponse,
} from '@schemas/incidents/incidents.schema.js'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import { idirToken } from '../helpers/auth.js'
import { getTestDatabase, resetDatabase } from '../helpers/database.js'

const YEAR = 2021

describe('Incident Count', () => {
  let app: FastifyInstance
  let secondSpeciesId: number

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
  })

  beforeEach(async () => {
    await resetDatabase()
    app.responseCache.clear()

    const [first, second] = await getTestDatabase()
      .selectFrom('species')
      .select('id')
      .orderBy('id')
      .limit(2)
      .execute()
    if (!first || !second) {
      throw new Error('expected at least two species')
    }
    secondSpeciesId = second.id

    const incident = (
      year: number,
      speciesId: number,
      accidentDate: string,
    ) => ({
      year,
      species_id: speciesId,
      accident_date: accidentDate,
      latitude: '48.43',
      longitude: '-123.35',
      lki_segment_id: null,
    })

    await getTestDatabase()
      .insertInto('incidents')
      .values([
        incident(YEAR, first.id, '2021-03-04'),
        incident(YEAR, first.id, '2021-07-19'),
        incident(YEAR, first.id, '2021-11-27'),
        incident(YEAR, second.id, '2021-12-02'),
        incident(2020, first.id, '2020-05-14'),
      ])
      .execute()
  })

  function get(url: string, authorized = true) {
    return app.inject({
      method: 'GET',
      url,
      headers: {
        ...(authorized && { authorization: `Bearer ${idirToken()}` }),
        'accept-encoding': 'identity',
      },
    })
  }

  async function count(params: string): Promise<IncidentCountResponse> {
    const res = await get(`/v1/incidents/count?${params}`)

    expect(res.statusCode).toBe(200)
    return res.json<IncidentCountResponse>()
  }

  async function total(params: string): Promise<number> {
    const res = await get(`/v1/incidents/?${params}`)

    expect(res.statusCode).toBe(200)
    return res.json<IncidentsResponse>().total
  }

  it('count matches the incidents total for a year filter', async () => {
    const params = `year=${YEAR}`

    expect(await count(params)).toEqual({ total: 4 })
    expect(await total(params)).toBe(4)
  })

  it('count matches the incidents total for a species filter', async () => {
    const params = `year=${YEAR}&species=${secondSpeciesId}`

    expect(await count(params)).toEqual({ total: 1 })
    expect(await total(params)).toBe(1)
  })

  it('count covers every selected year', async () => {
    expect(await count(`year=2020,${YEAR}`)).toEqual({ total: 5 })
  })

  it('rejects a missing year', async () => {
    const res = await get('/v1/incidents/count')

    expect(res.statusCode).toBe(400)
  })

  it('rejects more than the maximum years', async () => {
    const years = Array.from(
      { length: MAX_SELECTED_YEARS + 1 },
      (_, i) => 2000 + i,
    ).join(',')
    const res = await get(`/v1/incidents/count?year=${years}`)

    expect(res.statusCode).toBe(400)
  })

  it('requires a token', async () => {
    const res = await get(`/v1/incidents/count?year=${YEAR}`, false)

    expect(res.statusCode).toBe(401)
  })
})
