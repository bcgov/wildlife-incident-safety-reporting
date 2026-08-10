import fastifyRateLimit, {
  normalizeIP,
  type RateLimitOptions,
} from '@fastify/rate-limit'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

// A route-level config replaces the global limit rather than stacking with it
export const PROBE_RATE_LIMIT: RateLimitOptions = {
  max: 10,
  timeWindow: '1 minute',
}

const createRateLimitConfig = (fastify: FastifyInstance) => ({
  max: fastify.config.rateLimitMax,
  timeWindow: '1 minute',
  hook: 'preHandler' as const,
  // keyGenerator runs before allowList, so it must be total. Fall back to IP
  // rather than a shared constant so a misconfigured /v1/* route (auth bypass)
  // can't collapse all unauthenticated traffic into one DoS-able bucket.
  // A custom generator opts out of the plugin's /64 collapsing, so redo it here
  keyGenerator: (req: FastifyRequest) =>
    req.user?.sub ?? (req.ip ? normalizeIP(req.ip, 64) : 'unknown'),
  allowList: (req: FastifyRequest) => !req.url.split('?')[0].startsWith('/v1/'),
})

export default fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(fastifyRateLimit, createRateLimitConfig(fastify))
  },
  {
    dependencies: ['config'],
  },
)
