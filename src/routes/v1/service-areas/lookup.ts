import { ErrorSchema } from '@schemas/common/error.schema.js'
import {
  LookupQuerySchema,
  LookupResponseSchema,
} from '@schemas/service-areas/lookup.schema.js'
import { logRouteError } from '@utils/route-errors.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  fastify.get(
    '/lookup',
    {
      schema: {
        summary: 'Look up service area by coordinates',
        operationId: 'lookupServiceArea',
        description:
          'Returns the service area containing the given point, or null if outside all boundaries.',
        querystring: LookupQuerySchema,
        response: {
          200: LookupResponseSchema,
          500: ErrorSchema,
        },
        tags: ['Service Areas'],
      },
    },
    async (request, reply) => {
      try {
        const { lng, lat } = request.query
        return await fastify.db.findServiceAreaByLocation(lng, lat)
      } catch (error) {
        logRouteError(fastify.log, request, error, {
          message: 'Failed to look up service area',
        })
        return reply.internalServerError('Failed to look up service area')
      }
    },
  )
}

export default plugin
