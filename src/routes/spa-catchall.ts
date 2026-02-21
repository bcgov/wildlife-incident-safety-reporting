import type { FastifyInstance } from 'fastify'

/**
 * SPA catch-all route handler.
 * Must be registered last (after all other routes) to act as a catch-all.
 * Serves the SPA HTML for client-side routing.
 */
export default async function spaRoute(fastify: FastifyInstance) {
  fastify.get(
    '/*',
    {
      preHandler: async (request, reply) => {
        const path = request.url.split('?')[0] ?? request.url

        // Skip API routes and static assets
        const lastSeg = path.split('/').pop() ?? ''
        if (
          path === '/v1' ||
          path.startsWith('/v1/') ||
          path === '/favicon.ico' ||
          lastSeg.includes('.')
        ) {
          return reply.callNotFound()
        }

        // Only serve SPA for HTML navigations; return 404 for non-HTML (e.g., XHR/fetch)
        const accept = request.headers.accept ?? ''
        if (typeof accept === 'string' && !accept.includes('text/html')) {
          return reply.callNotFound()
        }
      },
    },
    (_req, reply) => {
      return reply.html()
    },
  )
}
