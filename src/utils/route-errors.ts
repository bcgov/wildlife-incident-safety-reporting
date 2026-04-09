import type { FastifyBaseLogger, FastifyRequest } from 'fastify'

interface RouteErrorContext {
  err: unknown
  route?: string
  userId?: string | number
  [key: string]: unknown
}

interface LogRouteErrorOptions {
  message?: string
  context?: Record<string, unknown>
  level?: 'error' | 'warn' | 'info'
  [key: string]: unknown
}

export function logRouteError(
  logger: FastifyBaseLogger,
  request: FastifyRequest,
  error: unknown,
  options: LogRouteErrorOptions = {},
): void {
  const route = `${request.method} ${request.routeOptions?.url || request.url}`

  const baseContext: RouteErrorContext = {
    err: error,
    route,
  }

  if ('user' in request && request.user) {
    baseContext.userId = request.user.sub
  }

  if (options.context) {
    Object.assign(baseContext, options.context)
  }

  const { message: _message, context: _context, ...directContext } = options
  Object.assign(baseContext, directContext)

  const message = options.message || `Error in route ${route}`

  const level = options.level ?? 'error'
  switch (level) {
    case 'warn':
      logger.warn(baseContext, message)
      break
    case 'info':
      logger.info(baseContext, message)
      break
    default:
      logger.error(baseContext, message)
  }
}
