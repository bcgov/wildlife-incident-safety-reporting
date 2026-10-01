import { BuildGate } from '@services/build-gate.js'
import { describe, expect, it } from 'vitest'

const PENDING = Symbol('pending')

function pending<T>(promise: Promise<T>): Promise<T | typeof PENDING> {
  return Promise.race([promise, Promise.resolve(PENDING)])
}

describe('BuildGate', () => {
  it('runs two builds at once and queues the third', async () => {
    const gate = new BuildGate()

    expect(await pending(gate.acquire())).toBeTypeOf('function')
    expect(await pending(gate.acquire())).toBeTypeOf('function')
    expect(await pending(gate.acquire())).toBe(PENDING)
    expect(gate.running).toBe(2)
    expect(gate.queued).toBe(1)
  })

  it('hands a released slot to the next waiter', async () => {
    const gate = new BuildGate()
    const release = await gate.acquire()
    await gate.acquire()
    const waiter = gate.acquire()

    release?.()

    expect(await pending(waiter)).toBeTypeOf('function')
    expect(gate.running).toBe(2)
    expect(gate.queued).toBe(0)
  })

  it('turns away a build once the queue is full', async () => {
    const gate = new BuildGate(1, 1)

    expect(await pending(gate.acquire())).toBeTypeOf('function')
    expect(await pending(gate.acquire())).toBe(PENDING)
    expect(await gate.acquire()).toBeUndefined()
  })

  it('ignores a second release of the same slot', async () => {
    const gate = new BuildGate(1, 0)
    const release = await gate.acquire()

    release?.()
    release?.()

    expect(gate.running).toBe(0)
    expect(await pending(gate.acquire())).toBeTypeOf('function')
  })
})
