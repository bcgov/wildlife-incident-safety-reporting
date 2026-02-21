import type { FastifyBaseLogger } from 'fastify'
import type { LevelWithSilent, LoggerOptions } from 'pino'

export const validLogLevels: LevelWithSilent[] = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
]

/**
 * Creates a custom error serializer that handles both standard errors and custom HttpError objects.
 */
function createErrorSerializer() {
  return (err: Error | Record<string, unknown> | string | number | boolean) => {
    if (err == null) {
      return err
    }

    if (typeof err !== 'object') {
      const primitiveType =
        typeof err === 'string'
          ? 'StringError'
          : typeof err === 'number'
            ? 'NumberError'
            : 'BooleanError'
      return { message: String(err), type: primitiveType }
    }

    const serialized: Record<string, unknown> = {}

    if ('message' in err && err.message) serialized.message = err.message
    if ('name' in err && err.name) serialized.name = err.name
    if ('status' in err && err.status !== undefined)
      serialized.status = err.status
    if ('statusCode' in err && err.statusCode !== undefined)
      serialized.statusCode = err.statusCode

    if (err instanceof TypeError) {
      serialized.type = 'TypeError'
    } else if (err instanceof ReferenceError) {
      serialized.type = 'ReferenceError'
    } else if (err instanceof SyntaxError) {
      serialized.type = 'SyntaxError'
    } else if (err instanceof RangeError) {
      serialized.type = 'RangeError'
    } else if (err instanceof AggregateError) {
      serialized.type = 'AggregateError'
    } else if (err instanceof Error) {
      serialized.type = 'Error'
    } else if ('name' in err && typeof err.name === 'string' && err.name) {
      serialized.type = err.name
    } else {
      serialized.type = 'UnknownError'
    }

    const statusCode =
      'statusCode' in err && typeof err.statusCode === 'number'
        ? err.statusCode
        : 'status' in err && typeof err.status === 'number'
          ? err.status
          : undefined
    const shouldIncludeStack = !statusCode || statusCode >= 500
    if ('stack' in err && err.stack && shouldIncludeStack) {
      serialized.stack = err.stack
    }

    if ('cause' in err && err.cause) {
      serialized.cause = createErrorSerializer()(
        err.cause as
          | Error
          | Record<string, unknown>
          | string
          | number
          | boolean,
      )
    }

    for (const key of Object.keys(err)) {
      if (
        !['message', 'stack', 'name', 'status', 'statusCode', 'type'].includes(
          key,
        )
      ) {
        serialized[key] = (err as Record<string, unknown>)[key]
      }
    }

    return serialized
  }
}

/**
 * Returns a serializer function for Fastify requests that redacts sensitive query parameters.
 */
function createRequestSerializer() {
  return (request: {
    method: string
    url: string
    headers: Record<string, unknown>
    ip: string
    socket: { remotePort: number }
  }) => {
    const serialized = {
      method: request.method,
      url: request.url,
      host: request.headers.host as string | undefined,
      remoteAddress: request.ip,
      remotePort: request.socket.remotePort,
    }

    if (serialized.url) {
      serialized.url = serialized.url
        .replace(/([?&])apiKey=([^&]+)/gi, '$1apiKey=[REDACTED]')
        .replace(/([?&])password=([^&]+)/gi, '$1password=[REDACTED]')
        .replace(/([?&])token=([^&]+)/gi, '$1token=[REDACTED]')
    }

    return serialized
  }
}

/**
 * Create a child logger that prefixes all messages with an uppercased service name.
 */
export function createServiceLogger(
  parentLogger: FastifyBaseLogger,
  serviceName: string,
): FastifyBaseLogger {
  return parentLogger.child(
    {},
    { msgPrefix: `[${serviceName.toUpperCase()}] ` },
  )
}

/**
 * Build pino logger options for stdout output.
 * All logging goes to stdout for container-based deployments (OpenShift/Docker).
 */
export function createLoggerConfig(): LoggerOptions {
  return {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true,
      },
    },
    serializers: {
      req: createRequestSerializer(),
      error: createErrorSerializer(),
      err: createErrorSerializer(),
    },
  }
}
