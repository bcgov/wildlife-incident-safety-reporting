import { ResponseCacheService } from '@services/response-cache.js'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    responseCache: ResponseCacheService
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    const cache = new ResponseCacheService(fastify.log)
    fastify.decorate('responseCache', cache)
    fastify.addHook('onClose', async () => {
      cache.clear()
    })
  },
  {
    name: 'response-cache',
  },
)
