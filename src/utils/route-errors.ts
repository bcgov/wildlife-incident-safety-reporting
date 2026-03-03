import type { FastifyBaseLogger, FastifyRequest } from 'fastify'

interface RouteErrorContext {
  /** The error that occurred (uses pino's built-in err serializer) */
  err: unknown
  /** HTTP method and path (e.g., 'GET /v1/items') */
  route?: string
  /** User ID if authenticated */
  userId?: string | number
  /** Additional context fields */
  [key: string]: unknown
}

interface LogRouteErrorOptions {
  /** Custom log message (defaults to generic error message based on route) */
  message?: string
  /** Additional context to include in logs */
  context?: Record<string, unknown>
  /** Log level; defaults to 'error' */
  level?: 'error' | 'warn' | 'info'
  /** Allow any additional context fields directly on the options object */
  [key: string]: unknown
}

/**
 * Standardized error logging helper for route handlers
 */
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
