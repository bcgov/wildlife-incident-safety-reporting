import type { FastifyInstance } from 'fastify'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import { idirToken } from '../helpers/auth.js'
import {
  noRouteBody,
  ROUTE_COORDINATES,
  ROUTE_PLANNER_URL,
  routeFoundBody,
} from '../mocks/route-planner.js'
import { server } from '../setup/msw-setup.js'

describe('Route Planner', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
  })

  beforeEach(() => {
    app.routePlanner.clearCache()
  })

  const auth = () => ({ authorization: `Bearer ${idirToken()}` })

  const ROUTE_URL =
    '/v1/route?startLng=-123.36&startLat=48.42&endLng=-123.34&endLat=48.44'

  it('returns the route line and summary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: ROUTE_URL,
      headers: auth(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      routeFound: true,
      distance: 12.345,
      distanceUnit: 'km',
      line: { type: 'LineString', coordinates: ROUTE_COORDINATES },
    })
  })

  it('returns 200 with a null line when no route exists', async () => {
    server.use(
      http.get(ROUTE_PLANNER_URL, () => HttpResponse.json(noRouteBody())),
    )

    const res = await app.inject({
      method: 'GET',
      url: ROUTE_URL,
      headers: auth(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ routeFound: false, line: null })
  })

  it('never exposes the negative distance and time sentinels', async () => {
    server.use(
      http.get(ROUTE_PLANNER_URL, () => HttpResponse.json(noRouteBody())),
    )

    const res = await app.inject({
      method: 'GET',
      url: ROUTE_URL,
      headers: auth(),
    })

    const body = res.json()
    expect(body.distance).toBeGreaterThanOrEqual(0)
    expect(body.time).toBeGreaterThanOrEqual(0)
    expect(body.timeText).not.toContain('-1')
  })

  it('returns 502 when the Route Planner errors', async () => {
    server.use(
      http.get(
        ROUTE_PLANNER_URL,
        () => new HttpResponse(null, { status: 500 }),
      ),
    )

    const res = await app.inject({
      method: 'GET',
      url: ROUTE_URL,
      headers: auth(),
    })

    expect(res.statusCode).toBe(502)
  })

  it('sends a resource road penalty so corridors follow highways', async () => {
    let gdf: string | null = null
    server.use(
      http.get(ROUTE_PLANNER_URL, ({ request }) => {
        gdf = new URL(request.url).searchParams.get('gdf')
        return HttpResponse.json(routeFoundBody())
      }),
    )

    await app.inject({ method: 'GET', url: ROUTE_URL, headers: auth() })

    expect(gdf).toBe('resource:2.0,')
  })

  it('serves a repeated lookup from cache instead of the upstream API', async () => {
    let calls = 0
    server.use(
      http.get(ROUTE_PLANNER_URL, () => {
        calls += 1
        return HttpResponse.json(routeFoundBody())
      }),
    )

    await app.inject({ method: 'GET', url: ROUTE_URL, headers: auth() })
    await app.inject({ method: 'GET', url: ROUTE_URL, headers: auth() })

    expect(calls).toBe(1)
  })

  it('rejects coordinates outside the valid range', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/route?startLng=-200&startLat=48.4&endLng=-123.34&endLat=48.44',
      headers: auth(),
    })

    expect(res.statusCode).toBe(400)
  })
})
