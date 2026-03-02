import type { Encoding } from '@services/response-cache.js'
import type { FastifyReply } from 'fastify'

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
