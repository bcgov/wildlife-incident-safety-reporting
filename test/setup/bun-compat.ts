import http from 'node:http'

// Bun doesn't set writableEnded synchronously after res.end(), which breaks
// Fastify's reply.sent check (reads raw.writableEnded). Without this polyfill,
// light-my-request tests get ERR_HTTP_HEADERS_SENT from double-sends.
const origEnd = http.ServerResponse.prototype.end as (
  this: http.ServerResponse,
  ...args: unknown[]
) => http.ServerResponse

http.ServerResponse.prototype.end = function (
  this: http.ServerResponse,
  ...args: unknown[]
) {
  const result = origEnd.apply(this, args)
  if (!this.writableEnded) {
    Object.defineProperty(this, 'writableEnded', {
      value: true,
      configurable: true,
    })
  }
  return result
} as typeof http.ServerResponse.prototype.end
