import { ErrorSchema } from '@schemas/common/error.schema.js'
import {
  RouteQuerySchema,
  RouteResponseSchema,
} from '@schemas/route-planner/route.schema.js'
import { logRouteError } from '@utils/route-errors.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  fastify.get(
    '/',
    {
      schema: {
        summary: 'Get a route between two points',
        operationId: 'getRoute',
        description:
          'Returns the road route between two points from the BC Route Planner as a GeoJSON LineString with distance and travel time.',
        querystring: RouteQuerySchema,
        response: {
          200: RouteResponseSchema,
          400: ErrorSchema,
          502: ErrorSchema,
        },
        tags: ['Route'],
      },
    },
    async (request, reply) => {
      try {
        return await fastify.routePlanner.getRoute(request.query)
      } catch (error) {
        logRouteError(fastify.log, request, error, {
          message: 'Failed to fetch route from BC Route Planner',
        })
        return reply.badGateway('Failed to fetch route from BC Route Planner')
      }
    },
  )
}

export default plugin
