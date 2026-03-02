import { promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'

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
  private readonly ttlMs: number
  private readonly maxEntries: number

  constructor(options?: Partial<ResponseCacheOptions>) {
    this.ttlMs = options?.ttlMs ?? DEFAULT_OPTIONS.ttlMs
    this.maxEntries = options?.maxEntries ?? DEFAULT_OPTIONS.maxEntries
  }

  private pruneExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) this.cache.delete(key)
    }
  }

  get(key: string, encoding: Encoding): Buffer | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    return entry.buffers[encoding]
  }

  async set(key: string, json: string): Promise<CompressedBuffers> {
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      this.pruneExpired()
    }
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) this.cache.delete(oldestKey)
    }

    const [br, gz] = await Promise.all([
      brotliCompressAsync(json, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
      }),
      gzipAsync(json),
    ])
    const buffers: CompressedBuffers = { br, gzip: gz }
    this.cache.set(key, { buffers, expiresAt: Date.now() + this.ttlMs })
    return buffers
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}
