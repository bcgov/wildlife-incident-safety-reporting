import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { jwksHandlers } from '../helpers/auth.js'
import { routePlannerHandlers } from '../mocks/route-planner.js'

const defaultHandlers = [...jwksHandlers, ...routePlannerHandlers]

export const server = setupServer(...defaultHandlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers(...defaultHandlers)
})

afterAll(() => {
  server.close()
})
