import { ErrorSchema } from '@schemas/common/error.schema.js'
import { NotModifiedResponse } from '@schemas/common/not-modified.schema.js'
import { LkiSegmentsResponseSchema } from '@schemas/lki/segments.schema.js'
import { logRouteError } from '@utils/route-errors.js'
import { sendCached } from '@utils/send-compressed.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const CACHE_KEY = '/v1/lki/segments'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  fastify.get(
    '/segments',
    {
      schema: {
        summary: 'Get LKI highway segments',
        operationId: 'getLkiSegments',
        description:
          'Returns every LKI highway segment with its geometry. Join to GET /v1/incidents/density by segmentId.',
        response: {
          200: LkiSegmentsResponseSchema,
          304: NotModifiedResponse,
          500: ErrorSchema,
          503: ErrorSchema,
        },
        tags: ['LKI'],
      },
    },
    async (request, reply) => {
      try {
        return await sendCached(fastify, request, reply, CACHE_KEY, () =>
          fastify.db.findLkiSegments(),
        )
      } catch (error) {
        logRouteError(fastify.log, request, error, {
          message: 'Failed to fetch LKI segments',
        })
        return reply.internalServerError('Failed to fetch LKI segments')
      }
    },
  )
}

export default plugin
