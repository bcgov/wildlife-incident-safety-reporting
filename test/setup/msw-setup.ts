import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { jwksHandlers } from '../helpers/auth.js'

export const server = setupServer(...jwksHandlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers(...jwksHandlers)
})

afterAll(() => {
  server.close()
})
