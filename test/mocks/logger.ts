import type { FastifyBaseLogger } from 'fastify'
import { vi } from 'vitest'

export function createMockLogger(): FastifyBaseLogger {
  const mockLogger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
    silent: vi.fn(),
    level: 'info',
  } as unknown as FastifyBaseLogger

  mockLogger.child = vi.fn(() => createMockLogger())

  return mockLogger
}
