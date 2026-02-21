import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  // Public paths that don't require authentication
  const publicPaths = ['/', '/health']

  fastify.addHook('onRequest', async (request, _reply) => {
    const urlWithoutQuery = request.url.split('?')[0]

    // Allow public paths
    const isPublicPath = publicPaths.some(
      (path) =>
        urlWithoutQuery === path || urlWithoutQuery.startsWith(`${path}/`),
    )

    if (isPublicPath) {
      return
    }

    // Skip auth for static assets
    const lastSeg = urlWithoutQuery.split('/').pop() ?? ''
    if (lastSeg.includes('.')) {
      return
    }

    // TODO: Validate Keycloak JWT from Authorization: Bearer <token> header
    // 1. Extract token from request.headers.authorization
    // 2. Validate against Keycloak JWKS endpoint or introspection endpoint
    // 3. Attach user info to request (request.user)
    // 4. Return 401 if invalid/missing
  })
}
