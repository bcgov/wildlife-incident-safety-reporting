import { z } from 'zod'

export const ServiceAreaSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string(),
    contractAreaNumber: z.number().int().positive(),
    district: z.string(),
    region: z.string(),
  })
  .meta({
    id: 'ServiceArea',
    description: 'Highway maintenance service area',
  })

export type ServiceArea = z.infer<typeof ServiceAreaSchema>
