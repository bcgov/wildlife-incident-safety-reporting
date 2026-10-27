import { getResponse, isPassthroughResponse, type RequestHandler } from 'msw'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { jwksHandlers } from '../helpers/auth.js'
import { routePlannerHandlers } from '../mocks/route-planner.js'

const defaultHandlers: RequestHandler[] = [
  ...jwksHandlers,
  ...routePlannerHandlers,
]
let handlers = [...defaultHandlers]
const realFetch = globalThis.fetch

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('This operation was aborted', 'AbortError')
}

// msw/node hooks Node socket internals Bun lacks, so the global fetch is swapped for a getResponse lookup instead
async function mockedFetch(
  ...[input, init]: Parameters<typeof fetch>
): Promise<Response> {
  const request =
    input instanceof Request
      ? new Request(input, init)
      : new Request(input.toString(), init)
  const signal = init?.signal ?? request.signal
  if (signal.aborted) throw abortError(signal)
  const listener = new AbortController()
  const aborted = new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(abortError(signal)), {
      signal: listener.signal,
    })
  })
  try {
    const response = await Promise.race([
      getResponse(handlers, new Request(request)),
      aborted,
    ])
    if (response === undefined || isPassthroughResponse(response)) {
      return realFetch(request)
    }
    if (response.type === 'error') throw new TypeError('Failed to fetch')
    return response
  } finally {
    listener.abort()
  }
}

export const server = {
  use(...added: RequestHandler[]): void {
    handlers = [...added, ...handlers]
  },
  resetHandlers(): void {
    handlers = [...defaultHandlers]
  },
}

beforeAll(() => {
  globalThis.fetch = Object.assign(mockedFetch, {
    preconnect: realFetch.preconnect,
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  globalThis.fetch = realFetch
})
