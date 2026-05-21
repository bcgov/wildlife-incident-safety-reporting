import { randomBytes } from 'node:crypto'
import type { FastifyHelmetOptions } from '@fastify/helmet'
import helmet from '@fastify/helmet'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

declare module 'node:http' {
  interface ServerResponse {
    cspNonce?: string
  }
}

function createHelmetConfig(fastify: FastifyInstance): FastifyHelmetOptions {
  const { keycloakUrl, baseMapStyleUrl } = fastify.config
  const keycloakOrigin = new URL(keycloakUrl).origin
  const baseMapOrigin = new URL(baseMapStyleUrl).origin
  const isDev = process.env.NODE_ENV !== 'production'

  return {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", (_req, res) => `'nonce-${res.cspNonce ?? ''}'`],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://services.arcgisonline.com',
          'https://tiles.arcgis.com',
          'https://*.google.com',
          'https://maps.gstatic.com',
          'https://maps.googleapis.com',
        ],
        connectSrc: [
          "'self'",
          'data:',
          keycloakOrigin,
          'https://maps.googleapis.com',
          'https://geocoder.api.gov.bc.ca',
          baseMapOrigin,
          'https://services.arcgisonline.com',
          'https://tiles.arcgis.com',
        ],
        frameSrc: ["'self'", keycloakOrigin, 'https://*.google.com'],
        fontSrc: ["'self'", 'data:'],
        workerSrc: ["'self'", 'blob:'],
        formAction: ["'self'", keycloakOrigin],
        // Safari auto-upgrades http://localhost when set, breaking local dev.
        ...(isDev && { 'upgrade-insecure-requests': null }),
      },
    },
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    fastify.addHook('onRequest', async (_request, reply) => {
      const nonce = randomBytes(16).toString('hex')
      reply.cspNonce = { script: nonce, style: nonce }
      reply.raw.cspNonce = nonce
    })
    await fastify.register(helmet, createHelmetConfig(fastify))
  },
  {
    name: 'helmet-plugin',
    dependencies: ['config'],
  },
)
