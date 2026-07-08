import { isConnectionError } from '@utils/db-errors.js'
import { createLoggerConfig, isValidLogLevel } from '@utils/logger.js'
import closeWithGrace from 'close-with-grace'
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import serviceApp from './app.js'

async function init() {
  const enableRequestLogging = /^(\s*(true|1|yes|on)\s*)$/i.test(
    process.env.ENABLE_REQUEST_LOGGING ?? '',
  )

  const app = Fastify({
    logger: createLoggerConfig(),
    ajv: {
      customOptions: {
        coerceTypes: 'array',
        removeAdditional: 'all',
      },
    },
    pluginTimeout: 60000,
    forceCloseConnections: true,
    disableRequestLogging: !enableRequestLogging,
    trustProxy: 1,
  })

  await app.register(fp(serviceApp))
  await app.ready()

  const configLogLevel = app.config.logLevel
  if (isValidLogLevel(configLogLevel)) {
    app.log.level = configLogLevel
  }

  // A dead socket's release-path rejection has no request to catch it; keep it from reaching close-with-grace as fatal.
  process.on('unhandledRejection', (reason) => {
    if (isConnectionError(reason)) {
      app.log.warn(
        { err: reason },
        'discarded a stale database connection rejection; the pool will reconnect',
      )
      return
    }
    app.log.error({ err: reason }, 'unhandled rejection, shutting down')
    app.close().finally(() => process.exit(1))
  })

  closeWithGrace(
    {
      delay: app.config.closeGraceDelay,
      logger: app.log,
      skip: ['unhandledRejection'],
    },
    async ({ signal, err }) => {
      if (err) {
        app.log.error({ err }, 'server closing with error')
      } else {
        app.log.info(`${signal} received, server closing`)
      }
      await app.close()
    },
  )

  try {
    await app.listen({
      port: app.config.listenPort,
      host: '0.0.0.0',
    })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

init()
