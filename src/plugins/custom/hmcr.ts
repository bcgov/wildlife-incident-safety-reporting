import { HmcrSyncService } from '@services/hmcr/hmcr-sync.js'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    hmcrSync: HmcrSyncService
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    const syncService = new HmcrSyncService(fastify.log, fastify)
    fastify.decorate('hmcrSync', syncService)
  },
  {
    name: 'hmcr',
    dependencies: ['config', 'database'],
  },
)
