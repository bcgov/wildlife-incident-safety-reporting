import { requireEnv } from '../src/services/database/create-database.js'

const url =
  process.env.DATABASE_URL ||
  `postgres://${encodeURIComponent(requireEnv('DB_USER'))}:${encodeURIComponent(requireEnv('DB_PASSWORD'))}@${requireEnv('DB_HOST')}:${requireEnv('DB_PORT')}/${requireEnv('DB_NAME')}`

const result = Bun.spawnSync(
  [
    process.execPath,
    'run',
    '--bun',
    'kysely-codegen',
    ...process.argv.slice(2),
  ],
  {
    env: { ...process.env, DATABASE_URL: url },
    stdio: ['inherit', 'inherit', 'inherit'],
  },
)

process.exit(result.exitCode)
