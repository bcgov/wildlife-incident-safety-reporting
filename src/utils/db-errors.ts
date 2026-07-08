interface CodedError extends Error {
  code?: string
}

const CONNECTION_ERROR_CODES = new Set<string>([
  'ERR_POSTGRES_CONNECTION_CLOSED',
  'ERR_POSTGRES_IDLE_TIMEOUT',
  'ERR_POSTGRES_LIFETIME_TIMEOUT',
  'ERR_POSTGRES_CONNECTION_TIMEOUT',
])

// Bun reports a dead pooled connection by message, not only via the codes above.
const CONNECTION_ERROR_MESSAGES = [
  'connection must be a PostgresSQLConnection',
  'Connection closed',
]

export function isConnectionError(err: unknown): err is CodedError {
  if (!(err instanceof Error)) return false
  const { code } = err as CodedError
  return (
    (code !== undefined && CONNECTION_ERROR_CODES.has(code)) ||
    CONNECTION_ERROR_MESSAGES.some((needle) => err.message.includes(needle))
  )
}
