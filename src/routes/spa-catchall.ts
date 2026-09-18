import type { FastifyInstance } from 'fastify'

// Must be registered last (after all other routes) to act as a catch-all
export default async function spaRoute(fastify: FastifyInstance) {
  fastify.get(
    '/*',
    {
      preHandler: async (request, reply) => {
        const path = request.url.split('?')[0] ?? request.url

        const lastSeg = path.split('/').pop() ?? ''
        if (
          path === '/v1' ||
          path.startsWith('/v1/') ||
          path === '/favicon.ico' ||
          lastSeg.includes('.')
        ) {
          return reply.callNotFound()
        }

        // Link preview bots send */* or no Accept, so only an explicit non-HTML type 404s
        const accept = request.headers.accept ?? ''
        if (
          accept !== '' &&
          !accept.includes('text/html') &&
          !accept.includes('*/*')
        ) {
          return reply.callNotFound()
        }
      },
    },
    (_req, reply) => {
      // stale HTML would point at hashed bundles that no longer exist after a deploy
      reply.header('cache-control', 'no-cache')
      return reply.html()
    },
  )
}
