import { ErrorSchema } from '@schemas/common/error.schema.js'
import { LkiSyncResponseSchema } from '@schemas/incidents/lki-sync.schema.js'
import { logRouteError } from '@utils/route-errors.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  fastify.post(
    '/lki-sync',
    {
      schema: {
        security: [],
        summary: 'Sync LKI highway segments from BC WFS',
        operationId: 'syncLkiSegments',
        description:
          'Fetches all LKI highway segments from the BC DataCatalogue WFS and upserts them into the local database using chris_lki_segment_id for deduplication. Internal: not exposed via ingress.',
        response: {
          200: LkiSyncResponseSchema,
          500: ErrorSchema,
        },
        tags: ['Internal'],
      },
    },
    async (request, reply) => {
      try {
        const result = await fastify.lkiSync.sync()
        if (result.upserted > 0 || result.deleted > 0) {
          await fastify.responseCache.invalidate()
        }
        return result
      } catch (error) {
        logRouteError(fastify.log, request, error, {
          message: 'LKI sync failed',
        })
        return reply.internalServerError('LKI sync failed')
      }
    },
  )
}

export default plugin
