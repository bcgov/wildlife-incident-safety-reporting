import type { FastifyReply, FastifyRequest } from 'fastify'

// OpenShift router sets x-forwarded-host on public requests
export async function rejectPublicRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (request.headers['x-forwarded-host']) {
    return reply.callNotFound()
  }
}
