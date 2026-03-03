import { promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'
import { createServiceLogger } from '@utils/logger.js'
import type { FastifyBaseLogger } from 'fastify'

const brotliCompressAsync = promisify(brotliCompress)
const gzipAsync = promisify(gzip)

export type Encoding = 'br' | 'gzip'

export interface CompressedBuffers {
  br: Buffer
  gzip: Buffer
}

interface CacheEntry {
  buffers: CompressedBuffers
  expiresAt: number
}

interface ResponseCacheOptions {
  ttlMs: number
  maxEntries: number
}

const DEFAULT_OPTIONS: ResponseCacheOptions = {
  ttlMs: 60 * 60 * 1000, // 1 hour
  maxEntries: 100,
}

export class ResponseCacheService {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly log: FastifyBaseLogger
  private readonly ttlMs: number
  private readonly maxEntries: number

  constructor(
    baseLog: FastifyBaseLogger,
    options?: Partial<ResponseCacheOptions>,
  ) {
    this.log = createServiceLogger(baseLog, 'CACHE')
    this.ttlMs = options?.ttlMs ?? DEFAULT_OPTIONS.ttlMs
    this.maxEntries = options?.maxEntries ?? DEFAULT_OPTIONS.maxEntries
  }

  private pruneExpired(): void {
    const sizeBefore = this.cache.size
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) this.cache.delete(key)
    }
    const pruned = sizeBefore - this.cache.size
    if (pruned > 0) {
      this.log.debug(
        { pruned, remaining: this.cache.size },
        'pruned expired entries',
      )
    }
  }

  get(key: string, encoding: Encoding): Buffer | undefined {
    const entry = this.cache.get(key)
    if (!entry) {
      this.log.debug({ key, encoding }, 'cache miss')
      return undefined
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.log.debug({ key, encoding }, 'cache expired')
      return undefined
    }

    this.log.debug({ key, encoding }, 'cache hit')
    return entry.buffers[encoding]
  }

  async set(key: string, json: string): Promise<CompressedBuffers> {
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      this.pruneExpired()
    }
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
        this.log.debug({ evicted: oldestKey }, 'evicted oldest entry')
      }
    }

    const [br, gz] = await Promise.all([
      brotliCompressAsync(json, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
      }),
      gzipAsync(json),
    ])
    const buffers: CompressedBuffers = { br, gzip: gz }
    this.cache.set(key, { buffers, expiresAt: Date.now() + this.ttlMs })
    this.log.debug(
      { key, brBytes: br.byteLength, gzipBytes: gz.byteLength },
      'cached compressed response',
    )
    return buffers
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.log.debug({ size: this.cache.size }, 'clearing cache')
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}
