import fastifyJwt from '@fastify/jwt'
import type { JwtHeader } from 'fast-jwt'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import buildGetJwks from 'get-jwks'

export interface JwtUser {
  identity_provider: string
  idir_user_guid?: string
  preferred_username?: string
  display_name?: string
  email?: string
  client_roles?: string[]
  sub: string
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtUser
  }
}

type TokenOrHeader = JwtHeader | { header: JwtHeader; payload: unknown }

export default fp(
  async (fastify: FastifyInstance) => {
    const { keycloakUrl, keycloakRealm } = fastify.config
    const issuer = `${keycloakUrl}/realms/${keycloakRealm}`

    const getJwks = buildGetJwks({
      issuersWhitelist: [issuer],
      providerDiscovery: true,
    })

    await fastify.register(fastifyJwt, {
      decode: { complete: true },
      secret: async (_request: FastifyRequest, token: TokenOrHeader) => {
        const header = 'header' in token ? token.header : token
        try {
          return await getJwks.getPublicKey({
            kid: header.kid,
            alg: header.alg,
            domain: issuer,
          })
        } catch (err) {
          throw err instanceof Error ? err : new Error(String(err))
        }
      },
      verify: {
        allowedIss: [issuer],
      },
    })
  },
  {
    name: 'jwt',
    dependencies: ['config'],
  },
)
