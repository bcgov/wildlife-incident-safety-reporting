// Two concurrent builds keep the worst case (about 225MB each) under the 1Gi pod limit beside the 200MB cache
export const MAX_CONCURRENT_BUILDS = 2
export const MAX_QUEUED_BUILDS = 8

export class BuildGate {
  private active = 0
  private readonly waiting: Array<() => void> = []

  constructor(
    private readonly maxConcurrent = MAX_CONCURRENT_BUILDS,
    private readonly maxQueued = MAX_QUEUED_BUILDS,
  ) {}

  // Resolves with a release function, or undefined when the queue is full
  acquire(): Promise<(() => void) | undefined> {
    if (this.active < this.maxConcurrent) {
      this.active++
      return Promise.resolve(this.releaser())
    }
    if (this.waiting.length >= this.maxQueued) {
      return Promise.resolve(undefined)
    }
    return new Promise((resolve) => {
      this.waiting.push(() => resolve(this.releaser()))
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
        next()
      }
    }
  }
}
