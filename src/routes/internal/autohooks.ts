import { rejectPublicRequest } from '@utils/cluster-internal.js'
import type { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', rejectPublicRequest)
}
