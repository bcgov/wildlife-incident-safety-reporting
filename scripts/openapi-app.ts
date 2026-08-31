import path from 'node:path'
import fastifyAutoload from '@fastify/autoload'
import type { FastifyInstance, FastifyPluginOptions } from 'fastify'
import {
  createSerializerCompiler,
  validatorCompiler,
} from 'fastify-zod-openapi'

const serializerCompiler = createSerializerCompiler({
  stringify: JSON.stringify,
})

export default async function openapiApp(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions,
) {
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // spec generation only needs the schema-contract plugins; skip DB, JWT, cache, metrics
  await fastify.register(fastifyAutoload, {
    dir: path.join(import.meta.dirname, '../src/plugins/external'),
    options: { ...opts, timeout: 30000 },
    matchFilter: /(env|swagger|sensible)\.ts$/,
  })

  // autohooks calls fastify.rateLimit() at registration, which is not loaded here
  await fastify.register(fastifyAutoload, {
    dir: path.join(import.meta.dirname, '../src/routes'),
    ignorePattern: /autohooks/,
    options: { ...opts, timeout: 30000 },
  })
}
