import type { FastifyInstance } from 'fastify'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import { idirToken } from '../helpers/auth.js'
import { getTestDatabase, resetDatabase } from '../helpers/database.js'
import { noRouteBody, ROUTE_PLANNER_URL } from '../mocks/route-planner.js'
import { server } from '../setup/msw-setup.js'

const YEAR = 2021

// Matches the default MSW route: a short line north-east out of Victoria
const ON_ROUTE = { latitude: 48.43, longitude: -123.35 }
const OFF_ROUTE = { latitude: 48.42, longitude: -123.2 }

const ROUTE_PARAMS =
  'routeStartLng=-123.36&routeStartLat=48.42&routeEndLng=-123.34&routeEndLat=48.44'

describe('Route Corridor Filter', () => {
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
    app.routePlanner.clearCache()
    // resetDatabase preserves cache_generation, so entries stay addressable
    app.responseCache.clear()
  })

  const auth = () => ({ authorization: `Bearer ${idirToken()}` })

  async function seedIncident(point: { latitude: number; longitude: number }) {
    await getTestDatabase()
      .insertInto('incidents')
      .values({
        year: YEAR,
        species_id: speciesId,
        latitude: String(point.latitude),
        longitude: String(point.longitude),
      })
      .execute()
  }

  async function query(params: string): Promise<number> {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/incidents?year=${YEAR}&${params}`,
      headers: auth(),
    })
    expect(res.statusCode).toBe(200)
    return res.json().total
  }

  it('keeps only incidents inside the corridor', async () => {
    await seedIncident(ON_ROUTE)
    await seedIncident(OFF_ROUTE)

    expect(await query(`${ROUTE_PARAMS}&routeCorridorM=250`)).toBe(1)
  })

  it('returns every incident when no route points are given', async () => {
    await seedIncident(ON_ROUTE)
    await seedIncident(OFF_ROUTE)

    expect(await query('')).toBe(2)
  })

  it('admits the distant incident once the corridor is wide enough', async () => {
    await seedIncident(ON_ROUTE)
    await seedIncident(OFF_ROUTE)

    expect(await query(`${ROUTE_PARAMS}&routeCorridorM=20000`)).toBe(2)
  })

  it('rejects a partial set of route coordinates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/incidents?year=${YEAR}&routeStartLng=-123.36&routeStartLat=48.42`,
      headers: auth(),
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 502 when the corridor route cannot be resolved', async () => {
    server.use(
      http.get(ROUTE_PLANNER_URL, () => HttpResponse.json(noRouteBody())),
    )
    await seedIncident(ON_ROUTE)

    const res = await app.inject({
      method: 'GET',
      url: `/v1/incidents?year=${YEAR}&${ROUTE_PARAMS}`,
      headers: auth(),
    })

    expect(res.statusCode).toBe(502)
  })

  it('reuses the compressed corridor response until the cache is invalidated', async () => {
    await seedIncident(ON_ROUTE)
    const url = `/v1/incidents?year=${YEAR}&${ROUTE_PARAMS}&routeCorridorM=250`
    const headers = { ...auth(), 'accept-encoding': 'gzip' }

    const first = await app.inject({ method: 'GET', url, headers })
    expect(first.statusCode).toBe(200)
    expect(first.headers['content-encoding']).toBe('gzip')

    await seedIncident(ON_ROUTE)
    const cached = await app.inject({ method: 'GET', url, headers })
    expect(cached.rawPayload.equals(first.rawPayload)).toBe(true)

    await app.responseCache.invalidate()
    const fresh = await app.inject({ method: 'GET', url, headers })
    expect(fresh.rawPayload.equals(first.rawPayload)).toBe(false)
  })
})
