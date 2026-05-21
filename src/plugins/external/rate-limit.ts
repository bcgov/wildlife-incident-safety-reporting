import fastifyRateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

const createRateLimitConfig = (fastify: FastifyInstance) => ({
  max: fastify.config.rateLimitMax,
  timeWindow: '1 minute',
  hook: 'preHandler' as const,
  // keyGenerator runs before allowList, so it must be total. Fall back to IP
  // rather than a shared constant so a misconfigured /v1/* route (auth bypass)
  // can't collapse all unauthenticated traffic into one DoS-able bucket.
  keyGenerator: (req: { user?: { sub: string }; ip: string }) =>
    req.user?.sub ?? req.ip,
  allowList: (req: { url: string }) =>
    !req.url.split('?')[0].startsWith('/v1/'),
})

export default fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(fastifyRateLimit, createRateLimitConfig(fastify))
  },
  {
    dependencies: ['config'],
  },
)
