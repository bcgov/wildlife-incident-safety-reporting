import { generateKeyPairSync } from 'node:crypto'
import { createSigner } from 'fast-jwt'
import { HttpResponse, http } from 'msw'

export const TEST_ISSUER = 'http://localhost:8080/realms/test'

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
})

const { privateKey: wrongPrivateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
})

const publicJwk = publicKey.export({ format: 'jwk' })

const jwks = {
  keys: [
    {
      ...publicJwk,
      kid: 'test-key-1',
      use: 'sig',
      alg: 'RS256',
    },
  ],
}

// Keycloak OIDC discovery + JWKS - registered as default MSW handlers
// so the real @fastify/jwt + get-jwks chain works against test keys
export const jwksHandlers = [
  http.get(`${TEST_ISSUER}/.well-known/openid-configuration`, () =>
    HttpResponse.json({
      issuer: TEST_ISSUER,
      jwks_uri: `${TEST_ISSUER}/protocol/openid-connect/certs`,
    }),
  ),
  http.get(`${TEST_ISSUER}/protocol/openid-connect/certs`, () =>
    HttpResponse.json(jwks),
  ),
]

const sign = createSigner({
  key: privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
  algorithm: 'RS256',
  kid: 'test-key-1',
})

const signWrongKey = createSigner({
  key: wrongPrivateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
  algorithm: 'RS256',
  kid: 'wrong-key',
})

interface TokenClaims {
  sub?: string
  identity_provider?: string
  iss?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

interface TokenOptions {
  expiresIn?: number
}

export function generateToken(
  claims?: TokenClaims,
  options?: TokenOptions,
): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: 'test-user-guid',
    identity_provider: 'idir',
    iss: TEST_ISSUER,
    iat: now,
    exp: now + (options?.expiresIn ?? 3600),
    ...claims,
  }
  return sign(payload)
}

export function idirToken(overrides?: TokenClaims): string {
  return generateToken({ identity_provider: 'idir', ...overrides })
}

export function azureIdirToken(overrides?: TokenClaims): string {
  return generateToken({ identity_provider: 'azureidir', ...overrides })
}

export function bceidToken(overrides?: TokenClaims): string {
  return generateToken({ identity_provider: 'bceidbasic', ...overrides })
}

export function expiredToken(claims?: TokenClaims): string {
  const past = Math.floor(Date.now() / 1000) - 3600
  return generateToken({ exp: past, iat: past - 3600, ...claims })
}

export function tamperedToken(validToken: string): string {
  const [header, payload, signature] = validToken.split('.')
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  decoded.identity_provider = 'tampered'
  const newPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url')
  return `${header}.${newPayload}.${signature}`
}

export function wrongKeyToken(claims?: TokenClaims): string {
  const now = Math.floor(Date.now() / 1000)
  return signWrongKey({
    sub: 'test-user-guid',
    identity_provider: 'idir',
    iss: TEST_ISSUER,
    iat: now,
    exp: now + 3600,
    ...claims,
  })
}
