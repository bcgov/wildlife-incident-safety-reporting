import env from '@fastify/env'
import type { Config } from '@root/types/config.types.js'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

const schema = {
  type: 'object',
  required: [
    'PORT',
    'KEYCLOAK_URL',
    'KEYCLOAK_REALM',
    'KEYCLOAK_CLIENT_ID',
    'HMCR_ID',
    'HMCR_SECRET',
    'HMCR_API_URL',
    'HMCR_TOKEN_URL',
  ],
  properties: {
    BASE_URL: {
      type: 'string',
      default: 'http://localhost',
    },
    PORT: {
      type: 'number',
      default: 3033,
    },
    LISTEN_PORT: {
      type: 'number',
      default: 3033,
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
    DB_POOL_SIZE: {
      type: 'number',
      default: 20,
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
    KEYCLOAK_URL: {
      type: 'string',
    },
    KEYCLOAK_REALM: {
      type: 'string',
    },
    KEYCLOAK_CLIENT_ID: {
      type: 'string',
    },
    HMCR_ID: {
      type: 'string',
    },
    HMCR_SECRET: {
      type: 'string',
    },
    HMCR_API_URL: {
      type: 'string',
    },
    HMCR_TOKEN_URL: {
      type: 'string',
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
  DB_POOL_SIZE: number
  LOG_LEVEL: string
  CLOSE_GRACE_DELAY: number
  RATE_LIMIT_MAX: number
  KEYCLOAK_URL: string
  KEYCLOAK_REALM: string
  KEYCLOAK_CLIENT_ID: string
  HMCR_ID: string
  HMCR_SECRET: string
  HMCR_API_URL: string
  HMCR_TOKEN_URL: string
}

declare module 'fastify' {
  interface FastifyInstance {
    envRaw: RawEnv
    config: Config
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    // @fastify/env validates + coerces process.env against the JSON Schema
    // and decorates fastify.envRaw with the SCREAMING_SNAKE_CASE result.
    await fastify.register(env, {
      confKey: 'envRaw',
      schema,
      dotenv: {
        path: './.env',
        debug: process.env.NODE_ENV === 'development',
        quiet: true,
      },
      data: process.env,
    })

    // Remap validated env vars to camelCase Config
    const raw = fastify.envRaw
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
      dbPoolSize: raw.DB_POOL_SIZE,
      logLevel: raw.LOG_LEVEL,
      closeGraceDelay: raw.CLOSE_GRACE_DELAY,
      rateLimitMax: raw.RATE_LIMIT_MAX,
      keycloakUrl: raw.KEYCLOAK_URL,
      keycloakRealm: raw.KEYCLOAK_REALM,
      keycloakClientId: raw.KEYCLOAK_CLIENT_ID,
      hmcrId: raw.HMCR_ID,
      hmcrSecret: raw.HMCR_SECRET,
      hmcrApiUrl: raw.HMCR_API_URL,
      hmcrTokenUrl: raw.HMCR_TOKEN_URL,
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

    // Decorate with the camelCase config
    fastify.decorate('config', config)
  },
  {
    name: 'config',
  },
)
