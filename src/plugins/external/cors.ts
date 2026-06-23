import type { FastifyCorsOptions } from '@fastify/cors'
import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

const createCorsConfig = (fastify: FastifyInstance): FastifyCorsOptions => {
  fastify.log.info(
    `Using baseUrl: ${fastify.config.baseUrl} for service connections`,
  )

  // SPA is served same-origin with the API, so the app's own host is the only legitimate cross-origin caller.
  const isDev = process.env.NODE_ENV !== 'production'

  return {
    origin: fastify.config.corsOrigin || isDev,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(cors, createCorsConfig(fastify))
  },
  {
    dependencies: ['config'],
  },
)
