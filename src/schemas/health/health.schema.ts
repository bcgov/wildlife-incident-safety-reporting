import { z } from 'zod'

export const HealthCheckResponseSchema = z
  .object({
    status: z.enum(['healthy', 'unhealthy']),
    timestamp: z.iso.datetime(),
    checks: z.object({
      database: z.enum(['ok', 'failed']),
    }),
  })
  .meta({
    id: 'HealthCheck',
    description: 'Application health status',
  })

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>
