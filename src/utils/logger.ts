import type { FastifyBaseLogger } from 'fastify'
import type { LevelWithSilent, LoggerOptions } from 'pino'
import { stdSerializers } from 'pino'

const validLogLevels: LevelWithSilent[] = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
]

export function isValidLogLevel(value: string): value is LevelWithSilent {
  return validLogLevels.includes(value as LevelWithSilent)
}

export function createServiceLogger(
  parentLogger: FastifyBaseLogger,
  serviceName: string,
): FastifyBaseLogger {
  return parentLogger.child(
    {},
    { msgPrefix: `[${serviceName.toUpperCase()}] ` },
  )
}

// Zod validation errors attach a multi-KB issue array
function serializeError(error: Error) {
  const { validation, ...serialized } = stdSerializers.err(error)
  return serialized
}

// Prod emits raw JSON for container log aggregators (OpenShift/Docker)
export function createLoggerConfig(): LoggerOptions {
  const isDev = process.env.NODE_ENV !== 'production'

  return {
    level: 'info',
    ...(!isDev && {
      base: null,
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      serializers: {
        err: serializeError,
      },
    }),
    ...(isDev && {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss Z',
          ignore: 'pid,hostname',
          colorize: true,
        },
      },
    }),
  }
}
