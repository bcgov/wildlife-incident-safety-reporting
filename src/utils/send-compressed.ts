import type { Encoding } from '@services/response-cache.js'
import type { FastifyReply } from 'fastify'

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
