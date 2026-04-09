import { z } from 'zod'

// Matches Fastify Sensible HttpError structure
export const ErrorSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  error: z.string(),
  message: z.string().min(1),
})

export type ErrorResponse = z.infer<typeof ErrorSchema>
