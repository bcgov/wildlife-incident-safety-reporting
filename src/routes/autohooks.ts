import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    const path = request.url.split('?')[0]

    // Only protect API routes - everything else is public
    if (path !== '/v1' && !path.startsWith('/v1/')) {
      return
    }

    try {
      await request.jwtVerify()
    } catch {
      return reply.unauthorized('Authentication required')
    }

    // Ensure the token was issued via IDIR (standard or Azure-backed)
    const { identity_provider } = request.user
    if (identity_provider !== 'idir' && identity_provider !== 'azureidir') {
      return reply.unauthorized('IDIR authentication required')
    }
  })
}
