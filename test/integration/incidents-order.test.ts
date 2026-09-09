import type { IncidentsResponse } from '@schemas/incidents/incidents.schema.js'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import { idirToken } from '../helpers/auth.js'
import { getTestDatabase, resetDatabase } from '../helpers/database.js'

const YEAR = 2021
const DATES = ['2021-03-04', '2021-07-19', '2021-11-27']

describe('Incident Pagination Order', () => {
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
      .insertInto('incidents')
      .values(
        DATES.map((accidentDate) => ({
          year: YEAR,
          species_id: speciesId,
          accident_date: accidentDate,
          latitude: '48.43',
          longitude: '-123.35',
          lki_segment_id: null,
        })),
      )
      .execute()
  })

  async function fetchPage(params: string): Promise<IncidentsResponse> {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/incidents/?year=${YEAR}${params}`,
      headers: {
        authorization: `Bearer ${idirToken()}`,
        'accept-encoding': 'identity',
      },
    })

    expect(res.statusCode).toBe(200)
    return res.json<IncidentsResponse>()
  }

  it('returns the newest incidents first when paginating', async () => {
    const page = await fetchPage('&limit=2&offset=0')

    expect(page.total).toBe(3)
    expect(page.data.map((incident) => incident.accidentDate)).toEqual([
      DATES[2],
      DATES[1],
    ])
  })

  it('returns every incident when no limit is given', async () => {
    const page = await fetchPage('')

    expect(page.total).toBe(3)
    expect(page.data).toHaveLength(3)
  })
})
