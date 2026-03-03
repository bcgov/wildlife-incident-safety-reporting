import { ErrorSchema } from '@schemas/common/error.schema.js'
import { BoundariesResponseSchema } from '@schemas/service-areas/boundaries.schema.js'
import { logRouteError } from '@utils/route-errors.js'
import { negotiateEncoding, sendCompressed } from '@utils/send-compressed.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const CACHE_KEY = '/v1/service-areas/boundaries'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  fastify.get(
    '/',
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
        const encoding = negotiateEncoding(request.headers['accept-encoding'])

        if (encoding) {
          const cached = fastify.responseCache.get(CACHE_KEY, encoding)
          if (cached) {
            return sendCompressed(reply, cached, encoding)
          }
        }

        const body = await fastify.db.findServiceAreaBoundaries()

        if (encoding) {
          const buffers = await fastify.responseCache.set(
            CACHE_KEY,
            JSON.stringify(body),
          )
          return sendCompressed(reply, buffers[encoding], encoding)
        }

        return body
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
