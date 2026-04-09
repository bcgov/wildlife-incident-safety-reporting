import { z } from 'zod'

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).optional().meta({
    description: 'Max results to return (1-1000). Omit to fetch all.',
  }),
  offset: z.coerce.number().int().nonnegative().default(0).meta({
    description: 'Number of results to skip (used with limit)',
  }),
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

export function paginatedResponse<T extends z.ZodTypeAny>(itemSchema: T) {
  return z
    .object({
      data: z.array(itemSchema).meta({ description: 'Result items' }),
      total: z
        .number()
        .int()
        .nonnegative()
        .meta({ description: 'Total matching records (before pagination)' }),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .meta({ description: 'Requested page size (omitted when unbounded)' }),
      offset: z
        .number()
        .int()
        .nonnegative()
        .meta({ description: 'Number of records skipped' }),
    })
    .meta({ description: 'Paginated response envelope' })
}
