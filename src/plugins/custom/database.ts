import { createDatabase } from '@services/database/create-database.js'
import { DatabaseService } from '@services/database/database-service.js'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseService
  }
}

export default fp(
  async (fastify: FastifyInstance) => {
    const { config } = fastify

    const dbService = new DatabaseService(
      createDatabase({
        url: config.databaseUrl,
        hostname: config.dbHost,
        port: config.dbPort,
        username: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
        max: config.dbPoolSize,
      }),
      fastify.log,
    )

    fastify.decorate('db', dbService)

    fastify.addHook('onClose', async () => {
      fastify.log.info('Closing database connection...')
      await dbService.destroy()
    })
  },
  {
    name: 'database',
    dependencies: ['config'],
  },
)
