import { ErrorSchema } from '@schemas/common/error.schema.js'
import { NotModifiedResponse } from '@schemas/common/not-modified.schema.js'
import {
  DensityQuerySchema,
  DensityResponseSchema,
} from '@schemas/incidents/density.schema.js'
import {
  RouteCorridorError,
  RouteNotFoundError,
} from '@services/route-planner.js'
import { logRouteError } from '@utils/route-errors.js'
import { sendCached } from '@utils/send-compressed.js'
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
          304: NotModifiedResponse,
          400: ErrorSchema,
          422: ErrorSchema,
          500: ErrorSchema,
          502: ErrorSchema,
        },
        tags: ['Incidents'],
      },
    },
    async (request, reply) => {
      try {
        return await sendCached(
          fastify,
          request,
          reply,
          request.url,
          async () => {
            const routeLine = await fastify.routePlanner.resolveRouteLine(
              request.query,
            )
            return await fastify.db.findLkiDensity({
              ...request.query,
              routeLine,
            })
          },
        )
      } catch (error) {
        if (error instanceof RouteNotFoundError) {
          return reply.unprocessableEntity(error.message)
        }
        if (error instanceof RouteCorridorError) {
          logRouteError(fastify.log, request, error, {
            message: 'Failed to resolve route corridor',
          })
          return reply.badGateway(error.message)
        }
        logRouteError(fastify.log, request, error, {
          message: 'Failed to query LKI density',
        })
        return reply.internalServerError('Failed to query LKI density')
      }
    },
  )
}

export default plugin
