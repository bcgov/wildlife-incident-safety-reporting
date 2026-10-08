import { BuildGate } from '@services/build-gate.js'
import { describe, expect, it } from 'vitest'

const PENDING = Symbol('pending')

function pending<T>(promise: Promise<T>): Promise<T | typeof PENDING> {
  return Promise.race([promise, Promise.resolve(PENDING)])
}

async function acquireSlot(gate: BuildGate, key?: string): Promise<() => void> {
  const acquired = await gate.acquire(key)
  if (!acquired.ok) throw new Error(`expected a slot, got ${acquired.reason}`)
  return acquired.release
}

describe('BuildGate', () => {
  it('runs two builds at once and queues the third', async () => {
    const gate = new BuildGate()

    expect(await pending(gate.acquire())).toMatchObject({ ok: true })
    expect(await pending(gate.acquire())).toMatchObject({ ok: true })
    expect(await pending(gate.acquire())).toBe(PENDING)
    expect(gate.running).toBe(2)
    expect(gate.queued).toBe(1)
  })

  it('hands a released slot to the next waiter', async () => {
    const gate = new BuildGate()
    const first = await acquireSlot(gate)
    await gate.acquire()
    const waiter = gate.acquire()

    first()

    expect(await pending(waiter)).toEqual({
      ok: true,
      release: expect.any(Function),
    })
    expect(gate.running).toBe(2)
    expect(gate.queued).toBe(0)
  })

  it('turns away a build once the queue is full', async () => {
    const gate = new BuildGate(1, 1)

    expect(await pending(gate.acquire())).toMatchObject({ ok: true })
    expect(await pending(gate.acquire())).toBe(PENDING)
    expect(await gate.acquire()).toEqual({ ok: false, reason: 'full' })
  })

  it('ignores a second release of the same slot', async () => {
    const gate = new BuildGate(1, 0)
    const first = await acquireSlot(gate)

    first()
    first()

    expect(gate.running).toBe(0)
    expect(await pending(gate.acquire())).toMatchObject({ ok: true })
  })

  it('supersedes an older queued build with the same key', async () => {
    const gate = new BuildGate(1, 8)
    const holder = await acquireSlot(gate)
    const a = gate.acquire('u1:/r')
    const b = gate.acquire('u1:/r')

    expect(await pending(a)).toEqual({ ok: false, reason: 'superseded' })
    expect(await pending(b)).toBe(PENDING)
    expect(gate.queued).toBe(1)

    holder()

    expect(await pending(b)).toMatchObject({ ok: true })
  })

  it('leaves other keys and running builds alone', async () => {
    const gate = new BuildGate(1, 8)
    const holder = await acquireSlot(gate, 'u1:/r')
    const x = gate.acquire('u2:/r')
    const y = gate.acquire('u1:/other')
    const z = gate.acquire('u1:/r')

    expect(await pending(x)).toBe(PENDING)
    expect(await pending(y)).toBe(PENDING)
    expect(await pending(z)).toBe(PENDING)
    expect(gate.queued).toBe(3)

    holder()

    expect(await pending(x)).toMatchObject({ ok: true })
    expect(gate.running).toBe(1)
    expect(gate.queued).toBe(2)
  })

  it('does not supersede without a key', async () => {
    const gate = new BuildGate(1, 8)
    await gate.acquire()
    const first = gate.acquire()
    const second = gate.acquire()

    expect(await pending(first)).toBe(PENDING)
    expect(await pending(second)).toBe(PENDING)
    expect(gate.queued).toBe(2)
  })
})
