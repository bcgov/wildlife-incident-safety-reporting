// Two concurrent builds keep the worst case (about 225MB each) under the 1Gi pod limit beside the 200MB cache
export const MAX_CONCURRENT_BUILDS = 2
export const MAX_QUEUED_BUILDS = 8

export type Acquired =
  | { ok: true; release: () => void }
  | { ok: false; reason: 'full' | 'superseded' }

interface Waiter {
  key: string | undefined
  resolve: (acquired: Acquired) => void
}

export class BuildGate {
  private active = 0
  private waiting: Waiter[] = []

  constructor(
    private readonly maxConcurrent = MAX_CONCURRENT_BUILDS,
    private readonly maxQueued = MAX_QUEUED_BUILDS,
  ) {}

  acquire(key?: string): Promise<Acquired> {
    if (this.active < this.maxConcurrent) {
      this.active++
      return Promise.resolve({ ok: true, release: this.releaser() })
    }
    if (key !== undefined) {
      const superseded = this.waiting.filter((waiter) => waiter.key === key)
      this.waiting = this.waiting.filter((waiter) => waiter.key !== key)
      for (const waiter of superseded) {
        waiter.resolve({ ok: false, reason: 'superseded' })
      }
    }
    if (this.waiting.length >= this.maxQueued) {
      return Promise.resolve({ ok: false, reason: 'full' })
    }
    return new Promise((resolve) => {
      this.waiting.push({ key, resolve })
    })
  }

  get queued(): number {
    return this.waiting.length
  }

  get running(): number {
    return this.active
  }

  private releaser(): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      this.active--
      const next = this.waiting.shift()
      if (next) {
        this.active++
        next.resolve({ ok: true, release: this.releaser() })
      }
    }
  }
}
