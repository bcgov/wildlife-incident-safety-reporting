import { expect } from 'vitest'

export function expectValidationError(
  statusCode: number,
  payload: string,
  expectedMessage: string,
) {
  expect(statusCode).toBe(400)
  const { message } = JSON.parse(payload)
  expect(message).toContain(expectedMessage)
}
