import { isIdentityProviderError } from '@utils/auth-errors.js'
import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  // A 401 here never reaches the preHandler limiter - count failed auth now
  const globalLimiter = fastify.rateLimit()

  fastify.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (error) {
      if (isIdentityProviderError(error)) {
        throw error
      }
      await globalLimiter.call(fastify, request, reply)
      return reply.unauthorized('Authentication required')
    }
  })
}
