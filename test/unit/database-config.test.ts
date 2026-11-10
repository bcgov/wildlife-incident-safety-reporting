import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import envPlugin from '@root/plugins/external/env.js'
import { createDatabase } from '@services/database/create-database.js'
import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const DB_VARS = [
  'DATABASE_URL',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
] as const

describe('database config fails closed', () => {
  let saved: Record<string, string | undefined>
  let originalCwd: string
  let emptyDir: string

  beforeEach(() => {
    saved = Object.fromEntries(DB_VARS.map((key) => [key, process.env[key]]))
    delete process.env.DATABASE_URL
    originalCwd = process.cwd()
    // The env plugin reads ./.env, so run from a directory without one.
    emptyDir = mkdtempSync(path.join(tmpdir(), 'wisr-config-'))
    process.chdir(emptyDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(emptyDir, { recursive: true, force: true })
    for (const key of DB_VARS) {
      const value = saved[key]
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it.each(['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'])(
    'refuses to boot the app without %s',
    async (key) => {
      delete process.env[key]
      const app = Fastify()

      await expect(app.register(envPlugin).ready()).rejects.toThrow(key)
      await app.close()
    },
  )

  it('boots from DATABASE_URL alone', async () => {
    process.env.DATABASE_URL = 'postgres://db.example.test:5432/wisr'
    for (const key of DB_VARS.filter((k) => k !== 'DATABASE_URL'))
      delete process.env[key]
    const app = Fastify()

    await expect(app.register(envPlugin).ready()).resolves.toBeDefined()
    await app.close()
  })

  it('refuses to build a client without DB_PASSWORD', () => {
    delete process.env.DB_PASSWORD

    expect(() => createDatabase()).toThrow(
      'DB_PASSWORD is required when DATABASE_URL is not set.',
    )
  })
})
