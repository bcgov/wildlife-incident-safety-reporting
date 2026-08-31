import { z } from 'zod'

export const HmcrSyncResponseSchema = z
  .object({
    created: z.number().int().nonnegative(),
    updated: z.number().int().nonnegative(),
    unchanged: z.number().int().nonnegative(),
    totalFetched: z.number().int().nonnegative(),
    errors: z.number().int().nonnegative(),
    durationMs: z.number().nonnegative(),
  })
  .meta({
    id: 'HmcrSyncResult',
    description: 'Counts from an HMCR sync run',
  })

export type HmcrSyncResponse = z.infer<typeof HmcrSyncResponseSchema>
