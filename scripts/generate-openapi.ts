import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import Fastify, { type FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import openapiApp from './openapi-app.js'

type FastifyInstanceWithSwagger = FastifyInstance & {
  swagger?: () => Record<string, unknown>
}

process.env.NODE_ENV = 'production'
const PLACEHOLDER_ENV = [
  'KEYCLOAK_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_CLIENT_ID',
  'SITEMINDER_LOGOUT_URL',
  'GOOGLE_MAPS_CLIENT_API_KEY',
  'BASE_MAP_STYLE_URL',
  'HMCR_ID',
  'HMCR_SECRET',
  'HMCR_API_URL',
  'HMCR_TOKEN_URL',
  'BC_ROUTE_PLANNER_API_KEY',
]
for (const key of PLACEHOLDER_ENV) {
  process.env[key] ??= 'openapi-codegen-placeholder'
}

const app = Fastify({
  logger: false,
  ajv: {
    customOptions: {
      coerceTypes: 'array',
      removeAdditional: 'all',
    },
  },
}) as FastifyInstanceWithSwagger

await app.register(fp(openapiApp))
await app.ready()

if (!app.swagger) {
  throw new Error('@fastify/swagger plugin is not loaded')
}

const specPath = resolve(process.cwd(), 'openapi.json')
const typesPath = resolve(process.cwd(), 'src/client/types/api.d.ts')

const spec = app.swagger()
await writeFile(specPath, JSON.stringify(spec, undefined, 2), { flag: 'w+' })
console.log(`OpenAPI spec generated: ${specPath}`)

await app.close()

const run = (cmd: string, args: string[]): Promise<number> => {
  const child = spawn(cmd, args, { stdio: 'inherit' })
  return new Promise<number>((res) => {
    child.on('exit', (code) => res(code ?? 1))
    child.on('error', (err) => {
      console.error(`${cmd} ${args.join(' ')} failed: ${err.message}`)
      res(1)
    })
  })
}

// codegen runs in scripts/openapi-codegen, whose pinned TS5 satisfies openapi-typescript's peer
for (const args of [
  ['install', '--cwd', 'scripts/openapi-codegen', '--silent'],
  ['run', '--cwd', 'scripts/openapi-codegen', 'generate'],
]) {
  const exit = await run('bun', args)
  if (exit !== 0) {
    console.error(`bun ${args.join(' ')} exited with code ${exit}`)
    process.exit(exit)
  }
}

console.log(`Client types generated: ${typesPath}`)

const formatterExit = await run('bun', ['run', 'fix'])
if (formatterExit !== 0) {
  console.warn(
    `Formatter exited with code ${formatterExit}; spec was still generated`,
  )
}
