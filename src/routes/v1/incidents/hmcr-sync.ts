import { ErrorSchema } from '@schemas/common/error.schema.js'
import { HmcrSyncResponseSchema } from '@schemas/incidents/hmcr-sync.schema.js'
import { logRouteError } from '@utils/route-errors.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  // Strip content-type on requests with no body to prevent Fastify's JSON
  // parser from choking on empty payloads (e.g. Scalar sends content-type:
  // application/json with no body on POST by default)
  fastify.addHook('preParsing', async (request) => {
    if (
      request.headers['content-length'] === '0' ||
      request.headers['content-length'] === undefined
    ) {
      delete request.headers['content-type']
    }
  })

  fastify.post(
    '/hmcr-sync',
    {
      schema: {
        summary: 'Sync wildlife incidents from HMCR',
        operationId: 'syncHmcrIncidents',
        description:
          'Fetches all wildlife records from the HMCR API and upserts them into the local database using hmcr_record_id for deduplication.',
        response: {
          200: HmcrSyncResponseSchema,
          500: ErrorSchema,
        },
        tags: ['Incidents'],
      },
    },
    async (request, reply) => {
      try {
        const result = await fastify.hmcrSync.sync()
        if (result.created > 0 || result.updated > 0) {
          fastify.responseCache.clear()
        }
        return result
      } catch (error) {
        logRouteError(fastify.log, request, error, {
          message: 'HMCR sync failed',
        })
        return reply.internalServerError('HMCR sync failed')
      }
    },
  )
}

export default plugin
