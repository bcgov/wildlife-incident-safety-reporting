import { z } from 'zod'

export const LkiSyncResponseSchema = z
  .object({
    totalFetched: z.number().int().nonnegative(),
    upserted: z.number().int().nonnegative(),
    deleted: z.number().int().nonnegative(),
    durationMs: z.number().nonnegative(),
  })
  .meta({
    id: 'LkiSyncResult',
    description: 'Counts from an LKI segment sync run',
  })

export type LkiSyncResponse = z.infer<typeof LkiSyncResponseSchema>
