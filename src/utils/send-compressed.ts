import type { Encoding } from '@services/response-cache.js'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

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
    .header('vary', 'Accept-Encoding')
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
  const cacheKey = await fastify.responseCache.versionedKey(baseKey)

  if (encoding) {
    const cached = fastify.responseCache.get(cacheKey, encoding)
    if (cached) {
      return sendCompressed(reply, cached, encoding)
    }
  }

  const body = await produce()

  if (!encoding) {
    return body
  }

  const buffers = await fastify.responseCache.set(
    cacheKey,
    JSON.stringify(body),
  )
  return sendCompressed(reply, buffers[encoding], encoding)
}
