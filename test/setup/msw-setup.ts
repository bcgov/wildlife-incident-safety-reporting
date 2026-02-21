import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'

/**
 * MSW (Mock Service Worker) setup for Vitest
 *
 * This file configures MSW to intercept HTTP requests during tests.
 * Individual test files can add their own request handlers as needed.
 *
 * @see https://mswjs.io/docs/integrations/node
 */

export const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
