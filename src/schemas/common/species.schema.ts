import { z } from 'zod'

export const SpeciesSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    color: z.string(),
    groupName: z.string(),
  })
  .meta({
    id: 'Species',
    description: 'Wildlife species with display color and species group',
  })

export type Species = z.infer<typeof SpeciesSchema>
