import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import { idirToken } from '../helpers/auth.js'
import { resetDatabase } from '../helpers/database.js'

const FILTERS_URL = '/v1/incidents/filters'
const BOUNDARIES_URL = '/v1/service-areas/boundaries'

describe('Response Cache Revalidation', () => {
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
  })

  const headers = () => ({
    authorization: `Bearer ${idirToken()}`,
    'accept-encoding': 'gzip',
  })

  async function fetchTag(url: string): Promise<string> {
    const res = await app.inject({ method: 'GET', url, headers: headers() })
    expect(res.statusCode).toBe(200)
    return String(res.headers.etag)
  }

  it('returns a compressed filters response with revalidation headers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: FILTERS_URL,
      headers: headers(),
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-encoding']).toBe('gzip')
    expect(res.headers.etag).toBeDefined()
    expect(res.headers['cache-control']).toBe('private, no-cache')
  })

  it('answers 304 with an empty body when the filters tag matches', async () => {
    const etag = await fetchTag(FILTERS_URL)

    const res = await app.inject({
      method: 'GET',
      url: FILTERS_URL,
      headers: { ...headers(), 'if-none-match': etag },
    })

    expect(res.statusCode).toBe(304)
    expect(res.payload).toBe('')
  })

  it('issues a new filters tag after the cache is invalidated', async () => {
    const etag = await fetchTag(FILTERS_URL)
    await app.responseCache.invalidate()

    const res = await app.inject({
      method: 'GET',
      url: FILTERS_URL,
      headers: { ...headers(), 'if-none-match': etag },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers.etag).not.toBe(etag)
  })

  it('rejects an unauthenticated revalidation before checking the tag', async () => {
    const etag = await fetchTag(FILTERS_URL)

    const res = await app.inject({
      method: 'GET',
      url: FILTERS_URL,
      headers: { 'accept-encoding': 'gzip', 'if-none-match': etag },
    })

    expect(res.statusCode).toBe(401)
  })

  it('revalidates service area boundaries the same way', async () => {
    const etag = await fetchTag(BOUNDARIES_URL)

    const res = await app.inject({
      method: 'GET',
      url: BOUNDARIES_URL,
      headers: { ...headers(), 'if-none-match': etag },
    })

    expect(res.statusCode).toBe(304)
    expect(res.payload).toBe('')
  })
})
