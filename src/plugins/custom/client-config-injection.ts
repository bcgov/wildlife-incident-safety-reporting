import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

// Injects server-side env values into the SPA HTML so the client can read
// them via window.__CONFIG__. Enables a single built bundle to be promoted
// across dev/test/prod without rebuilding for environment-specific values.
async function clientConfigInjection(fastify: FastifyInstance) {
  const clientConfig = {
    keycloakUrl: fastify.config.keycloakUrl,
    keycloakRealm: fastify.config.keycloakRealm,
    keycloakClientId: fastify.config.keycloakClientId,
    googleMapsApiKey: fastify.config.googleMapsApiKey,
  }

  // Escape '<' so a value containing '</script>' cannot break out of the tag.
  const json = JSON.stringify(clientConfig).replace(/</g, '\\u003c')
  const script = `<script>window.__CONFIG__=${json};</script>`

  fastify.addHook('onSend', async (_request, reply, payload) => {
    const contentType = reply.getHeader('content-type')
    if (
      typeof contentType === 'string' &&
      contentType.includes('text/html') &&
      typeof payload === 'string' &&
      payload.includes('<div id="app">')
    ) {
      return payload.replace(/<head[^>]*>/i, (match) => `${match}${script}`)
    }
    return payload
  })
}

export default fp(clientConfigInjection, {
  name: 'client-config-injection',
  dependencies: ['config'],
})
