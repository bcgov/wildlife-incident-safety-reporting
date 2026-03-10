import fastifySwagger from '@fastify/swagger'
import apiReference from '@scalar/fastify-api-reference'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import {
  fastifyZodOpenApiPlugin,
  fastifyZodOpenApiTransform,
  fastifyZodOpenApiTransformObject,
} from 'fastify-zod-openapi'

const createOpenapiConfig = (fastify: FastifyInstance) => {
  return {
    openapi: {
      info: {
        title: 'Wars API',
        description: 'API documentation for the Wars application',
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
    transformObject: fastifyZodOpenApiTransformObject,
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    // Must be registered before fastifySwagger for schema transformation to work
    await fastify.register(fastifyZodOpenApiPlugin)

    await fastify.register(fastifySwagger, createOpenapiConfig(fastify))

    await fastify.register(apiReference, {
      routePrefix: '/api/docs',
    })
  },
  {
    dependencies: ['config'],
  },
)
