import { z } from 'zod'

export const IncidentFiltersResponseSchema = z.object({
  years: z.array(z.number().int()),
  species: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      color: z.string(),
      groupName: z.string(),
    }),
  ),
  serviceAreas: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      contractAreaNumber: z.number(),
    }),
  ),
  sex: z.array(z.string()),
  timeOfKill: z.array(z.string()),
  age: z.array(z.string()),
  dateRange: z.object({
    min: z.iso.date().nullable(),
    max: z.iso.date().nullable(),
  }),
})

export type IncidentFiltersResponse = z.infer<
  typeof IncidentFiltersResponseSchema
>
