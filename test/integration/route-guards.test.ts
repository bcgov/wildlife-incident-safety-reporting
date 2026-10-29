import type { FastifyInstance, RouteOptions } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'

describe('Route guards', () => {
  let app: FastifyInstance
  const routes: RouteOptions[] = []
  let requestCount = 0

  beforeAll(async () => {
    app = await build(undefined, (route) => {
      routes.push(route)
    })
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
  })

  const toUrl = (template: string) =>
    template.replace(/:[^/]+/g, '1').replace(/\*/g, '1')

  const requestsFor = (predicate: (url: string) => boolean) =>
    routes
      .filter((route) => predicate(route.url))
      .flatMap((route) =>
        [route.method].flat().map((method) => ({
          method,
          url: toUrl(route.url),
        })),
      )

  const nextRemoteAddress = () => {
    requestCount += 1
    return `10.20.${Math.floor(requestCount / 256)}.${requestCount % 256}`
  }

  it('rejects anonymous requests to every /v1 route', async () => {
    const requests = requestsFor((url) => url.startsWith('/v1'))
    expect(requests.length).toBeGreaterThan(0)

    const failures: string[] = []
    for (const { method, url } of requests) {
      const res = await app.inject({
        method,
        url,
        remoteAddress: nextRemoteAddress(),
      })
      if (res.statusCode !== 401) {
        failures.push(`${method} ${url} -> ${res.statusCode}`)
      }
    }

    expect(failures).toEqual([])
  })

  it('hides every cluster-internal route from routed traffic', async () => {
    const requests = requestsFor(
      (url) =>
        url.startsWith('/internal/') || url === '/health' || url === '/metrics',
    )
    expect(requests.map(({ url }) => url)).toEqual(
      expect.arrayContaining(['/health', '/metrics']),
    )
    expect(requests.some(({ url }) => url.startsWith('/internal/'))).toBe(true)

    const failures: string[] = []
    for (const { method, url } of requests) {
      const res = await app.inject({
        method,
        url,
        headers: { 'x-forwarded-host': 'wisr.example.com' },
        remoteAddress: nextRemoteAddress(),
      })
      if (res.statusCode !== 404) {
        failures.push(`${method} ${url} -> ${res.statusCode}`)
      }
    }

    expect(failures).toEqual([])
  })
})
