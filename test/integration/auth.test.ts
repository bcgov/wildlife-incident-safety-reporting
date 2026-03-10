import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { build } from '../helpers/app.js'
import {
  azureIdirToken,
  bceidToken,
  expiredToken,
  generateToken,
  idirToken,
  tamperedToken,
  wrongKeyToken,
} from '../helpers/auth.js'

describe('Auth Security', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
  })

  const protectedUrl = '/v1/incidents'

  describe('Token Validation', () => {
    it('rejects missing Authorization header', async () => {
      const res = await app.inject({ method: 'GET', url: protectedUrl })
      expect(res.statusCode).toBe(401)
    })

    it('rejects empty Bearer value', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: 'Bearer ' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('rejects Basic auth scheme', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('rejects Bearer keyword with no token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: 'Bearer' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('rejects garbage string as token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: 'Bearer not.a.jwt' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('rejects expired token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: `Bearer ${expiredToken()}` },
      })
      expect(res.statusCode).toBe(401)
    })

    it('rejects tampered payload with original signature', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: `Bearer ${tamperedToken(idirToken())}` },
      })
      expect(res.statusCode).toBe(401)
    })

    it('rejects token signed by unknown key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: `Bearer ${wrongKeyToken()}` },
      })
      expect(res.statusCode).toBe(401)
    })

    it('accepts valid IDIR token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: `Bearer ${idirToken()}` },
      })
      expect(res.statusCode).not.toBe(401)
    })
  })

  describe('IDP Enforcement', () => {
    it('accepts azureidir identity provider', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: `Bearer ${azureIdirToken()}` },
      })
      expect(res.statusCode).not.toBe(401)
    })

    it('rejects bceidbasic identity provider', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: { authorization: `Bearer ${bceidToken()}` },
      })
      expect(res.statusCode).toBe(401)
      expect(JSON.parse(res.payload).message).toBe(
        'IDIR authentication required',
      )
    })

    it('rejects missing identity_provider claim', async () => {
      const res = await app.inject({
        method: 'GET',
        url: protectedUrl,
        headers: {
          authorization: `Bearer ${generateToken({ identity_provider: undefined })}`,
        },
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('Public Routes', () => {
    it('allows /health with no token', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.statusCode).toBe(200)
    })

    it('allows /health with invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { authorization: 'Bearer garbage' },
      })
      expect(res.statusCode).toBe(200)
    })
  })

  describe('Error Response Shape', () => {
    it('returns structured error with expected fields', async () => {
      const res = await app.inject({ method: 'GET', url: protectedUrl })
      const body = JSON.parse(res.payload)
      expect(body).toMatchObject({
        statusCode: 401,
        code: expect.any(String),
        error: expect.any(String),
        message: expect.any(String),
      })
    })

    it('does not leak stack traces or internal paths', async () => {
      const body = JSON.parse(
        (await app.inject({ method: 'GET', url: protectedUrl })).payload,
      )
      expect(body.stack).toBeUndefined()
      expect(body.path).toBeUndefined()
    })
  })
})
