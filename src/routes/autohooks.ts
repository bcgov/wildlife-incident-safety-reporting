import { isIdentityProviderError } from '@utils/auth-errors.js'
import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  // A 401 here never reaches the preHandler limiter - count failed auth now
  const globalLimiter = fastify.rateLimit()

  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0]

    // Cluster-internal only; OpenShift router sets x-forwarded-host on public requests
    if (
      (path === '/health' ||
        path === '/metrics' ||
        path.startsWith('/internal/')) &&
      request.headers['x-forwarded-host']
    ) {
      return reply.callNotFound()
    }

    // Only protect API routes - everything else is public
    if (path !== '/v1' && !path.startsWith('/v1/')) {
      return
    }

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
