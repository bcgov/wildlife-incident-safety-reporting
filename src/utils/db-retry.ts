import { isConnectionError } from '@utils/db-errors.js'
import type { FastifyBaseLogger } from 'fastify'

interface RetryOptions {
  attempts?: number
  delayMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Connection failures happen before commit, so replaying on a fresh connection is safe.
export async function withConnectionRetry<T>(
  operation: () => Promise<T>,
  log: FastifyBaseLogger,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? 3
  const delayMs = options.delayMs ?? 250

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation()
    } catch (err) {
      if (attempt === attempts || !isConnectionError(err)) {
        throw err
      }
      log.warn(
        { err, attempt, attempts },
        'lost database connection, retrying on a fresh connection',
      )
      await sleep(delayMs * attempt)
    }
  }

  throw new Error('withConnectionRetry exhausted without a result')
}
