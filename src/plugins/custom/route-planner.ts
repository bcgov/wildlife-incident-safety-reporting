import { RoutePlannerService } from '@services/route-planner.js'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    routePlanner: RoutePlannerService
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    const service = new RoutePlannerService(fastify.log, fastify)
    fastify.decorate('routePlanner', service)
  },
  {
    name: 'route-planner',
    dependencies: ['config'],
  },
)
