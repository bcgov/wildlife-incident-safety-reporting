import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'

describe('Content-Security-Policy', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
  })

  const nonceOf = (csp: string) => csp.match(/'nonce-([a-f0-9]{32})'/)?.[1]

  it('sets a CSP header on every response', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.headers['content-security-policy']).toBeDefined()
  })

  it('uses a nonce in script-src and does not fall back to unsafe-inline', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    const csp = String(res.headers['content-security-policy'])
    expect(csp).toMatch(/script-src[^;]*'nonce-[a-f0-9]{32}'/)
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
  })

  it('generates a fresh nonce per request', async () => {
    const a = await app.inject({ method: 'GET', url: '/health' })
    const b = await app.inject({ method: 'GET', url: '/health' })
    const nonceA = nonceOf(String(a.headers['content-security-policy']))
    const nonceB = nonceOf(String(b.headers['content-security-policy']))
    expect(nonceA).toBeDefined()
    expect(nonceB).toBeDefined()
    expect(nonceA).not.toBe(nonceB)
  })

  it('locks down the directives WISR depends on', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    const csp = String(res.headers['content-security-policy'])
    expect(csp).toMatch(/default-src 'self'/)
    expect(csp).toMatch(/frame-src[^;]*\*\.google\.com/)
    expect(csp).toMatch(/connect-src[^;]*geocoder\.api\.gov\.bc\.ca/)
    expect(csp).toMatch(/connect-src[^;]*tiles\.arcgis\.com/)
    expect(csp).toMatch(/object-src 'none'/)
    expect(csp).toMatch(/base-uri 'self'/)
  })

  it('emits HSTS with includeSubDomains', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    const hsts = String(res.headers['strict-transport-security'])
    expect(hsts).toMatch(/max-age=\d+/)
    expect(hsts).toMatch(/includeSubDomains/)
  })
})
