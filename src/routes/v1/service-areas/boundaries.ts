import { ErrorSchema } from '@schemas/common/error.schema.js'
import { BoundariesResponseSchema } from '@schemas/service-areas/boundaries.schema.js'
import { logRouteError } from '@utils/route-errors.js'
import { sendCached } from '@utils/send-compressed.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const CACHE_KEY = '/v1/service-areas/boundaries'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  fastify.get(
    '/boundaries',
    {
      schema: {
        summary: 'Get service area boundary polygons',
        operationId: 'getServiceAreaBoundaries',
        description:
          'Returns simplified boundary geometries for all service areas as a GeoJSON FeatureCollection.',
        response: {
          200: BoundariesResponseSchema,
          500: ErrorSchema,
        },
        tags: ['Service Areas'],
      },
    },
    async (request, reply) => {
      try {
        return await sendCached(fastify, request, reply, CACHE_KEY, () =>
          fastify.db.findServiceAreaBoundaries(),
        )
      } catch (error) {
        logRouteError(fastify.log, request, error, {
          message: 'Failed to fetch service area boundaries',
        })
        return reply.internalServerError(
          'Failed to fetch service area boundaries',
        )
      }
    },
  )
}

export default plugin
