import type { FastifyBaseLogger } from 'fastify'
import type { LevelWithSilent, LoggerOptions } from 'pino'

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

// Prod emits raw JSON for container log aggregators (OpenShift/Docker)
export function createLoggerConfig(): LoggerOptions {
  const isDev = process.env.NODE_ENV !== 'production'

  return {
    level: 'info',
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
