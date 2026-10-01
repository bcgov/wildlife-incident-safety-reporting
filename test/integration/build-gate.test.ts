import { BuildGate } from '@services/build-gate.js'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import { idirToken } from '../helpers/auth.js'
import { resetDatabase } from '../helpers/database.js'

const FILTERS_URL = '/v1/incidents/filters'

describe('Response Build Gate', () => {
  let app: FastifyInstance

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
    app.buildGate = new BuildGate()
  })

  const fetchFilters = () =>
    app.inject({
      method: 'GET',
      url: FILTERS_URL,
      headers: {
        authorization: `Bearer ${idirToken()}`,
        'accept-encoding': 'gzip',
      },
    })

  it('answers 503 with a retry hint when the build queue is full', async () => {
    app.buildGate = new BuildGate(0, 0)

    const res = await fetchFilters()

    expect(res.statusCode).toBe(503)
    expect(res.headers['retry-after']).toBe('2')
    expect(res.json()).toMatchObject({
      statusCode: 503,
      error: 'Service Unavailable',
      message: expect.any(String),
    })
  })

  it('serves a cached response even when the build queue is full', async () => {
    const first = await fetchFilters()
    expect(first.statusCode).toBe(200)

    app.buildGate = new BuildGate(0, 0)
    const res = await fetchFilters()

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-encoding']).toBe('gzip')
  })
})
