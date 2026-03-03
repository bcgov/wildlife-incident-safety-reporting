import { IncidentFiltersResponseSchema } from '@schemas/incidents/filters.schema.js'
import {
  IncidentErrorSchema,
  IncidentsQuerySchema,
  IncidentsResponseSchema,
} from '@schemas/incidents/incidents.schema.js'
import { logRouteError } from '@utils/route-errors.js'
import { negotiateEncoding, sendCompressed } from '@utils/send-compressed.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  fastify.get(
    '/',
    {
      schema: {
        summary: 'Query wildlife-vehicle incidents',
        operationId: 'getIncidents',
        description:
          'Returns wildlife-vehicle collision incidents with optional filtering by species, service area, date range, spatial geometry, and more.',
        querystring: IncidentsQuerySchema,
        response: {
          200: IncidentsResponseSchema,
          500: IncidentErrorSchema,
        },
        tags: ['Incidents'],
      },
    },
    async (request, reply) => {
      try {
        const encoding = negotiateEncoding(request.headers['accept-encoding'])

        if (encoding) {
          const cached = fastify.responseCache.get(request.url, encoding)
          if (cached) {
            return sendCompressed(reply, cached, encoding)
          }
        }

        const result = await fastify.db.findIncidents(request.query)
        const body = {
          data: result.data,
          total: result.total,
          limit: request.query.limit,
          offset: request.query.offset,
        }

        if (encoding) {
          const buffers = await fastify.responseCache.set(
            request.url,
            JSON.stringify(body),
          )
          return sendCompressed(reply, buffers[encoding], encoding)
        }

        return body
      } catch (error) {
        logRouteError(fastify.log, request, error, {
          message: 'Failed to query incidents',
        })
        return reply.internalServerError('Failed to query incidents')
      }
    },
  )

  fastify.get(
    '/filters',
    {
      schema: {
        summary: 'Get available incident filter options',
        operationId: 'getIncidentFilters',
        description:
          'Returns all available filter values for populating frontend dropdowns.',
        response: {
          200: IncidentFiltersResponseSchema,
          500: IncidentErrorSchema,
        },
        tags: ['Incidents'],
      },
    },
    async (request, reply) => {
      try {
        return await fastify.db.findIncidentFilters()
      } catch (error) {
        logRouteError(fastify.log, request, error, {
          message: 'Failed to fetch incident filters',
        })
        return reply.internalServerError('Failed to fetch incident filters')
      }
    },
  )
}

export default plugin
