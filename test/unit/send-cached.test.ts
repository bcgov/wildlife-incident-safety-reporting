import sensible from '@fastify/sensible'
import { BuildGate } from '@services/build-gate.js'
import { ResponseCacheService } from '@services/response-cache.js'
import { sendCached } from '@utils/send-compressed.js'
import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const FIRST_ETAG = '"g1-gzip"'

async function waitForRunning(gate: BuildGate, count: number): Promise<void> {
  const deadline = Date.now() + 1000
  while (gate.running !== count && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  expect(gate.running).toBe(count)
}

async function waitForQueued(gate: BuildGate, count: number): Promise<void> {
  const deadline = Date.now() + 1000
  while (gate.queued !== count && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  expect(gate.queued).toBe(count)
}

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
    app.decorate('buildGate', new BuildGate())
    await app.register(sensible)
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

describe('sendCached under load', () => {
  let app: FastifyInstance
  let gate: BuildGate
  let produced: number
  let finish: () => void

  beforeAll(async () => {
    produced = 0
    gate = new BuildGate(1, 0)
    app = Fastify({ logger: false })
    app.decorate(
      'responseCache',
      new ResponseCacheService(app.log, {
        read: async () => 1,
        bump: async () => {},
      }),
    )
    app.decorate('buildGate', gate)
    await app.register(sensible)
    app.addHook('preHandler', async (request) => {
      if (request.headers['x-gone']) request.raw.destroy()
    })
    app.get('/slow', (request, reply) =>
      sendCached(app, request, reply, request.url, async () => {
        produced += 1
        await new Promise<void>((resolve) => {
          finish = resolve
        })
        return { slow: true }
      }),
    )
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
  })

  const gzip = { 'accept-encoding': 'gzip' }

  it('rejects a second build with 503 while the only slot is held', async () => {
    const first = app.inject({ url: '/slow', headers: gzip })
    await waitForRunning(gate, 1)

    const second = await app.inject({ url: '/slow', headers: gzip })

    expect(second.statusCode).toBe(503)
    expect(second.headers['retry-after']).toBe('2')
    expect(produced).toBe(1)

    finish()
    const res = await first
    expect(res.statusCode).toBe(200)
    expect(gate.running).toBe(0)
  })

  it('skips the build when the client has already disconnected', async () => {
    const before = produced

    const res = await app.inject({
      url: '/slow?gone',
      headers: { ...gzip, 'x-gone': '1' },
    })

    expect(res.statusCode).toBe(503)
    expect(res.json().message).toBe(
      'Client disconnected before the response was built',
    )
    expect(produced).toBe(before)
  })
})

describe('sendCached superseding queued builds', () => {
  let app: FastifyInstance
  let gate: BuildGate
  let finish: () => void
  let held: Promise<void>

  beforeAll(async () => {
    gate = new BuildGate(1, 8)
    app = Fastify({ logger: false })
    app.decorate(
      'responseCache',
      new ResponseCacheService(app.log, {
        read: async () => 1,
        bump: async () => {},
      }),
    )
    app.decorate('buildGate', gate)
    await app.register(sensible)
    app.addHook('preHandler', async (request) => {
      const user = request.headers['x-user']
      if (typeof user === 'string') {
        request.user = { sub: user, identity_provider: 'test' }
      }
    })
    app.get('/slow', (request, reply) =>
      sendCached(app, request, reply, request.url, async () => {
        await held
        return { slow: true }
      }),
    )
    await app.ready()
  })

  beforeEach(() => {
    held = new Promise<void>((resolve) => {
      finish = resolve
    })
  })

  afterAll(async () => {
    await app?.close()
  })

  function asUser(user: string) {
    return { 'accept-encoding': 'gzip', 'x-user': user }
  }

  it("supersedes the same user's earlier queued request on a route", async () => {
    const a = app.inject({ url: '/slow?a', headers: asUser('u1') })
    await waitForRunning(gate, 1)
    const b = app.inject({ url: '/slow?b', headers: asUser('u1') })
    await waitForQueued(gate, 1)
    const c = app.inject({ url: '/slow?c', headers: asUser('u1') })

    const superseded = await b
    expect(superseded.statusCode).toBe(503)
    expect(superseded.json().message).toBe('Superseded by a newer request')
    expect(superseded.headers['retry-after']).toBeUndefined()

    finish()
    expect((await a).statusCode).toBe(200)
    expect((await c).statusCode).toBe(200)
  })

  it("keeps another user's queued request", async () => {
    const a = app.inject({ url: '/slow?d', headers: asUser('u1') })
    await waitForRunning(gate, 1)
    const b = app.inject({ url: '/slow?e', headers: asUser('u2') })
    await waitForQueued(gate, 1)
    const c = app.inject({ url: '/slow?f', headers: asUser('u1') })
    await waitForQueued(gate, 2)

    finish()
    expect((await a).statusCode).toBe(200)
    expect((await b).statusCode).toBe(200)
    expect((await c).statusCode).toBe(200)
  })
})
