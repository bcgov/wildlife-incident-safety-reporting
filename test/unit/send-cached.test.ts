import { ResponseCacheService } from '@services/response-cache.js'
import { sendCached } from '@utils/send-compressed.js'
import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const FIRST_ETAG = '"g1-gzip"'

describe('sendCached', () => {
  let app: FastifyInstance
  let generation: number
  let produced: number

  beforeAll(async () => {
    generation = 1
    produced = 0
    app = Fastify({ logger: false })
    app.decorate(
      'responseCache',
      new ResponseCacheService(app.log, {
        read: async () => generation,
        bump: async () => {
          generation += 1
        },
      }),
    )
    app.get('/thing', (request, reply) =>
      sendCached(app, request, reply, request.url, async () => {
        produced += 1
        return { hello: 'world', n: produced }
      }),
    )
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
  })

  const gzip = { 'accept-encoding': 'gzip' }

  it('sets the revalidation headers and compresses the first response', async () => {
    const res = await app.inject({ url: '/thing', headers: gzip })

    expect(res.statusCode).toBe(200)
    expect(res.headers.etag).toBe(FIRST_ETAG)
    expect(res.headers['cache-control']).toBe('private, no-cache')
    expect(res.headers.vary).toBe('Accept-Encoding')
    expect(res.headers['content-encoding']).toBe('gzip')
    expect(produced).toBe(1)
  })

  it('answers 304 with no body when the tag still matches', async () => {
    const res = await app.inject({
      url: '/thing',
      headers: { ...gzip, 'if-none-match': FIRST_ETAG },
    })

    expect(res.statusCode).toBe(304)
    expect(res.rawPayload.length).toBe(0)
    expect(produced).toBe(1)
  })

  it('serves an untagged repeat from the cache without producing again', async () => {
    const res = await app.inject({ url: '/thing', headers: gzip })

    expect(res.statusCode).toBe(200)
    expect(produced).toBe(1)
  })

  it('stops matching the old tag once the generation is bumped', async () => {
    await app.responseCache.invalidate()

    const res = await app.inject({
      url: '/thing',
      headers: { ...gzip, 'if-none-match': FIRST_ETAG },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers.etag).toBe('"g2-gzip"')
    expect(produced).toBe(2)
  })

  it('produces an uncompressed body for identity and never caches it', async () => {
    const res = await app.inject({
      url: '/thing',
      headers: { 'accept-encoding': 'identity' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-encoding']).toBeUndefined()
    expect(res.headers.etag).toBe('"g2-identity"')
    expect(res.json()).toEqual({ hello: 'world', n: 3 })
    expect(produced).toBe(3)
  })

  it('serves brotli from the entry a gzip request filled', async () => {
    const res = await app.inject({
      url: '/thing',
      headers: { 'accept-encoding': 'br' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-encoding']).toBe('br')
    expect(produced).toBe(3)
  })
})
