import type { DB } from '@services/database/types/database.js'
import { SQL } from 'bun'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { Kysely } from 'kysely'
import { PostgresJSDialect } from 'kysely-postgres-js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Kysely<DB>
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    const { config } = fastify

    const db = new Kysely<DB>({
      dialect: new PostgresJSDialect({
        postgres: config.databaseUrl
          ? new SQL(config.databaseUrl)
          : new SQL({
              hostname: config.dbHost,
              port: config.dbPort,
              username: config.dbUser,
              password: config.dbPassword,
              database: config.dbName,
              max: 10,
            }),
      }),
    })

    fastify.decorate('db', db)

    fastify.addHook('onClose', async () => {
      fastify.log.info('Closing database connection...')
      await db.destroy()
    })
  },
  {
    name: 'database',
    dependencies: ['config'],
  },
)
