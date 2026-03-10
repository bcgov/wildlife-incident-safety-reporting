import { z } from 'zod'

export const SpeciesSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  color: z.string(),
  groupName: z.string(),
})

export type Species = z.infer<typeof SpeciesSchema>
