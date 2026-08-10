import { STATUS_CODES } from 'node:http'
import type { ErrorResponse } from '@root/schemas/common/error.schema.js'
import type { FastifyError, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

async function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((err: FastifyError, request, reply) => {
    const raw = err.statusCode
    const statusCode =
      typeof raw === 'number' &&
      Number.isInteger(raw) &&
      raw >= 400 &&
      raw < 600
        ? raw
        : 500
    const statusText = STATUS_CODES[statusCode] ?? 'Error'

    // Avoid logging query/params to prevent leaking tokens/PII
    const logData = {
      err,
      request: {
        id: request.id,
        method: request.method,
        path: request.url.split('?')[0],
        route: request.routeOptions?.url,
      },
    }

    if (statusCode === 401) {
      request.log.warn(logData, 'Authentication required')
    } else if (statusCode < 500) {
      request.log.warn(logData, 'Client error occurred')
    } else {
      request.log.error(logData, 'Internal server error occurred')
    }

    const payload: ErrorResponse = {
      statusCode,
      error: statusText,
      // A 5xx message can carry upstream URLs or driver internals
      message: statusCode < 500 && err.message ? err.message : statusText,
    }

    reply.code(statusCode)
    return payload
  })
}

export default fp(errorHandler, {
  name: 'error-handler',
})
