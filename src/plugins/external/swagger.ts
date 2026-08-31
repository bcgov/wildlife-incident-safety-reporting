import fastifySwagger from '@fastify/swagger'
import apiReference from '@scalar/fastify-api-reference'
import { CLUSTER_INTERNAL_NOTE } from '@utils/route-docs.js'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import {
  fastifyZodOpenApiPlugin,
  fastifyZodOpenApiTransform,
  fastifyZodOpenApiTransformObject,
} from 'fastify-zod-openapi'
import type { OpenAPIV3 } from 'openapi-types'

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
] as const

const RATE_LIMITED_RESPONSE: OpenAPIV3.ResponseObject = {
  description: 'Rate limit exceeded',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
    },
  },
}

// The limiters sit outside route schemas, so no route declares its own 429
function addRateLimitResponses(paths: OpenAPIV3.PathsObject): void {
  for (const pathItem of Object.values(paths)) {
    for (const method of HTTP_METHODS) {
      const responses = pathItem?.[method]?.responses
      if (responses) {
        responses['429'] ??= structuredClone(RATE_LIMITED_RESPONSE)
      }
    }
  }
}

const createOpenapiConfig = (fastify: FastifyInstance) => {
  return {
    openapi: {
      info: {
        title: 'WISR API',
        description: 'API documentation for the WISR application',
        version: 'V1',
      },
      servers: [
        {
          url: '{protocol}://{host}:{port}',
          description: 'Custom Server',
          variables: {
            protocol: {
              enum: ['http', 'https'],
              default: 'http',
              description: 'The protocol used to communicate with the server',
            },
            host: {
              default: 'localhost',
              description: 'The hostname or IP address of the server',
            },
            port: {
              default: fastify.config.port.toString(),
              description: 'The port on which the server is running',
            },
          },
        },
        {
          url: fastify.config.baseUrl,
          description: 'Primary Server',
        },
        {
          url: `http://localhost:${fastify.config.port}`,
          description: 'Localhost Access (with port)',
        },
      ],
      tags: [
        {
          name: 'System',
          description: 'System health and monitoring endpoints',
        },
        {
          name: 'Incidents',
          description: 'Wildlife-vehicle collision incidents',
        },
        {
          name: 'Service Areas',
          description: 'Highway maintenance service area boundaries',
        },
        {
          name: 'Internal',
          description: `No token authentication. ${CLUSTER_INTERNAL_NOTE}`,
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http' as const,
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Keycloak JWT authentication',
          },
        },
      },
      security: [{ bearerAuth: [] as string[] }] as Array<
        Record<string, string[]>
      >,
    },
    hideUntagged: true,
    exposeRoute: true,
    transform: fastifyZodOpenApiTransform,
    transformObject: (
      args: Parameters<typeof fastifyZodOpenApiTransformObject>[0],
    ) => {
      const spec = fastifyZodOpenApiTransformObject(args)
      if ('openapi' in spec && spec.paths) {
        addRateLimitResponses(spec.paths)
      }
      return spec
    },
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    // Must be registered before fastifySwagger for schema transformation to work
    await fastify.register(fastifyZodOpenApiPlugin)

    await fastify.register(fastifySwagger, createOpenapiConfig(fastify))

    // Scalar's inline bootstrap script ships without a nonce, which our CSP blocks.
    await fastify.register(async (scope) => {
      scope.addHook('onSend', async (_request, reply, payload) => {
        const nonce = reply.raw.cspNonce
        const contentType = reply.getHeader('content-type')
        if (
          typeof payload !== 'string' ||
          !nonce ||
          typeof contentType !== 'string' ||
          !contentType.includes('text/html')
        ) {
          return payload
        }
        return payload.replaceAll('<script', `<script nonce="${nonce}"`)
      })

      await scope.register(apiReference, {
        routePrefix: '/api/docs',
        configuration: { withDefaultFonts: false },
      })
    })
  },
  {
    dependencies: ['config'],
  },
)
