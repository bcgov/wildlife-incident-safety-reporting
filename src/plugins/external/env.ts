import env from '@fastify/env'
import type { Config } from '@root/types/config.types.js'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

const schema = {
  type: 'object',
  required: ['PORT'],
  properties: {
    BASE_URL: {
      type: 'string',
      default: 'http://localhost',
    },
    PORT: {
      type: 'number',
      default: 3003,
    },
    LISTEN_PORT: {
      type: 'number',
      default: 3003,
    },
    DB_HOST: {
      type: 'string',
      default: 'localhost',
    },
    DB_PORT: {
      type: 'number',
      default: 5432,
    },
    DB_NAME: {
      type: 'string',
      default: 'wars',
    },
    DB_USER: {
      type: 'string',
      default: 'postgres',
    },
    DB_PASSWORD: {
      type: 'string',
      default: 'postgres',
    },
    DATABASE_URL: {
      type: 'string',
      default: '',
    },
    LOG_LEVEL: {
      type: 'string',
      enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
    },
    CLOSE_GRACE_DELAY: {
      type: 'number',
      default: 10000,
    },
    RATE_LIMIT_MAX: {
      type: 'number',
      default: 500,
    },
  },
}

/** Raw shape from @fastify/env using SCREAMING_SNAKE_CASE keys */
interface RawEnv {
  BASE_URL: string
  PORT: number
  LISTEN_PORT: number
  DB_HOST: string
  DB_PORT: number
  DB_NAME: string
  DB_USER: string
  DB_PASSWORD: string
  DATABASE_URL: string
  LOG_LEVEL: string
  CLOSE_GRACE_DELAY: number
  RATE_LIMIT_MAX: number
}

declare module 'fastify' {
  interface FastifyInstance {
    config: Config
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(env, {
      confKey: 'config',
      schema,
      dotenv: {
        path: './.env',
        debug: process.env.NODE_ENV === 'development',
        quiet: true,
      },
      data: process.env,
    })

    // Remap SCREAMING_SNAKE_CASE env vars to camelCase Config
    const raw = fastify.config as unknown as RawEnv
    const config: Config = {
      baseUrl: raw.BASE_URL,
      port: raw.PORT,
      listenPort: raw.LISTEN_PORT,
      dbHost: raw.DB_HOST,
      dbPort: raw.DB_PORT,
      dbName: raw.DB_NAME,
      dbUser: raw.DB_USER,
      dbPassword: raw.DB_PASSWORD,
      databaseUrl: raw.DATABASE_URL,
      logLevel: raw.LOG_LEVEL,
      closeGraceDelay: raw.CLOSE_GRACE_DELAY,
      rateLimitMax: raw.RATE_LIMIT_MAX,
    }

    // Validate PostgreSQL configuration
    const isUsingConnectionString =
      config.databaseUrl && config.databaseUrl.trim() !== ''

    if (isUsingConnectionString) {
      const connStr = config.databaseUrl.trim()
      if (
        !connStr.startsWith('postgres://') &&
        !connStr.startsWith('postgresql://')
      ) {
        throw new Error(
          'Invalid PostgreSQL connection string format. Must start with postgres:// or postgresql://',
        )
      }
    }

    if (!isUsingConnectionString) {
      if (!config.dbPassword || config.dbPassword.trim() === '') {
        throw new Error(
          'DB_PASSWORD is required. Please set a secure database password.',
        )
      }

      if (!config.dbHost || config.dbHost.trim() === '') {
        throw new Error('DB_HOST is required.')
      }

      if (!config.dbName || config.dbName.trim() === '') {
        throw new Error('DB_NAME is required.')
      }

      if (!config.dbUser || config.dbUser.trim() === '') {
        throw new Error('DB_USER is required.')
      }
    }

    // Replace the raw env object with our camelCase config
    fastify.config = config
  },
  {
    name: 'config',
  },
)
