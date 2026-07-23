import { ErrorSchema } from '@schemas/common/error.schema.js'
import {
  DensityQuerySchema,
  DensityResponseSchema,
} from '@schemas/incidents/density.schema.js'
import { logRouteError } from '@utils/route-errors.js'
import { negotiateEncoding, sendCompressed } from '@utils/send-compressed.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  fastify.get(
    '/density',
    {
      schema: {
        summary: 'Get LKI segment density analysis',
        operationId: 'getLkiDensity',
        description:
          'Returns incident counts per LKI segment with body-size weighting for linear heatmap visualization.',
        querystring: DensityQuerySchema,
        response: {
          200: DensityResponseSchema,
          400: ErrorSchema,
          500: ErrorSchema,
        },
        tags: ['Incidents'],
      },
    },
    async (request, reply) => {
      try {
        const encoding = negotiateEncoding(request.headers['accept-encoding'])
        const cacheKey = await fastify.responseCache.versionedKey(request.url)

        if (encoding) {
          const cached = fastify.responseCache.get(cacheKey, encoding)
          if (cached) {
            return sendCompressed(reply, cached, encoding)
          }
        }

        const result = await fastify.db.findLkiDensity(request.query)

        if (encoding) {
          const buffers = await fastify.responseCache.set(
            cacheKey,
            JSON.stringify(result),
          )
          return sendCompressed(reply, buffers[encoding], encoding)
        }

        return result
      } catch (error) {
        logRouteError(fastify.log, request, error, {
          message: 'Failed to query LKI density',
        })
        return reply.internalServerError('Failed to query LKI density')
      }
    },
  )
}

export default plugin
