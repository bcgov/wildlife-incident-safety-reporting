import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import { idirToken } from '../helpers/auth.js'

describe('Rate Limit', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
  })

  const protectedUrl = '/v1/incidents'

  it('attaches rate-limit headers to authenticated /v1/* responses', async () => {
    const token = idirToken({ sub: `headers-${Date.now()}` })
    const res = await app.inject({
      method: 'GET',
      url: protectedUrl,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.headers['x-ratelimit-limit']).toBeDefined()
    expect(res.headers['x-ratelimit-remaining']).toBeDefined()
  })

  it('gives each user their own bucket (keyed by sub, not IP)', async () => {
    const tokenA = idirToken({ sub: `user-a-${Date.now()}` })
    const tokenB = idirToken({ sub: `user-b-${Date.now()}` })

    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: `Bearer ${tokenA}` },
      })
    }

    const finalA = await app.inject({
      method: 'GET',
      url: protectedUrl,
      headers: { authorization: `Bearer ${tokenA}` },
    })
    const firstB = await app.inject({
      method: 'GET',
      url: protectedUrl,
      headers: { authorization: `Bearer ${tokenB}` },
    })

    const remainingA = Number(finalA.headers['x-ratelimit-remaining'])
    const remainingB = Number(firstB.headers['x-ratelimit-remaining'])

    expect(remainingB).toBeGreaterThan(remainingA)
  })

  it('exempts /health and does not crash the limiter', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).not.toBe(500)
    expect(res.headers['x-ratelimit-limit']).toBeUndefined()
    expect(res.headers['x-ratelimit-remaining']).toBeUndefined()
  })

  it('exempts /metrics and does not crash the limiter', async () => {
    const res = await app.inject({ method: 'GET', url: '/metrics' })
    expect(res.statusCode).not.toBe(500)
    expect(res.headers['x-ratelimit-limit']).toBeUndefined()
    expect(res.headers['x-ratelimit-remaining']).toBeUndefined()
  })
})
