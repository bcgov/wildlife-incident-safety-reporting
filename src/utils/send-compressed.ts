import type { Encoding } from '@services/response-cache.js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

const SLOW_BUILD_MS = 2000
const CLIENT_GONE = 'Client disconnected before the response was built'

export function negotiateEncoding(
  header: string | string[] | undefined,
): Encoding | undefined {
  if (typeof header !== 'string') return undefined
  if (header.includes('br')) return 'br'
  if (header.includes('gzip')) return 'gzip'
  return undefined
}

export function sendCompressed(
  reply: FastifyReply,
  buffer: Buffer,
  encoding: Encoding,
): FastifyReply {
  return reply
    .header('content-encoding', encoding)
    .type('application/json')
    .send(buffer)
}

export async function sendCached<T>(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  baseKey: string,
  produce: () => Promise<T>,
): Promise<T | FastifyReply> {
  const encoding = negotiateEncoding(request.headers['accept-encoding'])
  const generation = await fastify.responseCache.readGeneration()
  const etag = `"g${generation}-${encoding ?? 'identity'}"`

  // private keeps bearer-token responses out of shared caches
  reply
    .header('etag', etag)
    .header('cache-control', 'private, no-cache')
    .header('vary', 'Accept-Encoding')

  if (request.headers['if-none-match'] === etag) {
    return reply.code(304).send()
  }

  const cacheKey = fastify.responseCache.keyFor(generation, baseKey)

  if (encoding) {
    const cached = fastify.responseCache.get(cacheKey, encoding)
    if (cached) {
      return sendCompressed(reply, cached, encoding)
    }
  }

  return buildGated(fastify, request, reply, cacheKey, encoding, produce)
}

async function buildGated<T>(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  cacheKey: string,
  encoding: Encoding | undefined,
  produce: () => Promise<T>,
): Promise<T | FastifyReply> {
  const release = await fastify.buildGate.acquire()
  if (!release) {
    fastify.log.warn({ cacheKey }, 'response build queue full')
    reply.header('retry-after', '2')
    return reply.serviceUnavailable('Server busy, retry shortly')
  }

  const started = performance.now()
  const logIfSlow = (bytes: number) => {
    const ms = Math.round(performance.now() - started)
    if (ms > SLOW_BUILD_MS) {
      fastify.log.warn({ cacheKey, ms, bytes }, 'slow response build')
    }
  }

  try {
    if (request.raw.destroyed) {
      return reply.serviceUnavailable(CLIENT_GONE)
    }
    const body = await produce()
    if (request.raw.destroyed) {
      return reply.serviceUnavailable(CLIENT_GONE)
    }

    if (!encoding) {
      logIfSlow(0)
      return body
    }

    const json = JSON.stringify(body)
    const buffers = await fastify.responseCache.set(cacheKey, json)
    logIfSlow(json.length)
    return sendCompressed(reply, buffers[encoding], encoding)
  } finally {
    release()
  }
}
