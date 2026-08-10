interface CodedError extends Error {
  code?: string
}

// Notably excludes JWK_NOT_FOUND, which means a bad token rather than an outage
const IDENTITY_PROVIDER_ERROR_CODES = new Set<string>([
  'OPENID_CONFIGURATION_REQUEST_FAILED',
  'JWKS_REQUEST_FAILED',
  'NO_JWKS_URI',
  'NO_JWKS',
  'DOMAIN_NOT_ALLOWED',
])

export function isIdentityProviderError(err: unknown): err is CodedError {
  if (!(err instanceof Error)) return false
  const { code } = err as CodedError
  return code !== undefined && IDENTITY_PROVIDER_ERROR_CODES.has(code)
}
