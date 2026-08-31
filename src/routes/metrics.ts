import { MetricsResponseSchema } from '@schemas/metrics/metrics.schema.js'
import { CLUSTER_INTERNAL_NOTE } from '@utils/route-docs.js'
import type { FastifyPluginAsyncZodOpenApi } from 'fastify-zod-openapi'

const PROMETHEUS_CONTENT_TYPE = 'text/plain; version=0.0.4; charset=utf-8'

const plugin: FastifyPluginAsyncZodOpenApi = async (fastify) => {
  fastify.get(
    '/metrics',
    {
      schema: {
        security: [],
        summary: 'Prometheus metrics exposition',
        operationId: 'getMetrics',
        description: `Returns Prometheus metrics in exposition format. ${CLUSTER_INTERNAL_NOTE}`,
        tags: ['System'],
        response: {
          200: {
            description: 'Prometheus exposition format (text/plain)',
            content: {
              [PROMETHEUS_CONTENT_TYPE]: {
                schema: MetricsResponseSchema,
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const { client } = fastify.metrics
      const body = await client.register.metrics()
      return reply.type(client.register.contentType).send(body)
    },
  )
}

export default plugin
