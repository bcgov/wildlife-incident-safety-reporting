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
    const context = {
      request: {
        id: request.id,
        method: request.method,
        path: request.url.split('?')[0],
        route: request.routeOptions?.url,
        ip: request.ip,
      },
    }

    if (statusCode >= 500) {
      request.log.error({ ...context, err }, 'Internal server error occurred')
    } else {
      request.log.warn(
        { ...context, type: err.name, reason: err.message },
        statusCode === 401
          ? 'Authentication required'
          : 'Client error occurred',
      )
    }

    // A 5xx message can carry upstream URLs or driver internals
    const safeMessage =
      statusCode < 500 && typeof err.message === 'string' && err.message
        ? err.message
        : statusText

    const payload: ErrorResponse = {
      statusCode,
      error: statusText,
      message: safeMessage,
    }

    reply.code(statusCode)
    return payload
  })
}

export default fp(errorHandler, {
  name: 'error-handler',
})
