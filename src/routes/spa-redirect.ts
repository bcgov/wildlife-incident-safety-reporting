import type { FastifyInstance } from 'fastify'

/**
 * Root route handler.
 * Serves as the public landing page route.
 */
export default async function rootRoute(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    // Serve the SPA — the client-side router handles showing
    // the landing page with login button(s)
    return reply.html()
  })
}
