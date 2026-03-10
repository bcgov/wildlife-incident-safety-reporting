import type { FastifyInstance } from 'fastify'

export default async function rootRoute(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    return reply.html()
  })
}
