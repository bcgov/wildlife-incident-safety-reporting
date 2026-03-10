import { ServiceAreaSchema } from '@schemas/service-areas/service-area.schema.js'
import { z } from 'zod'

export const LookupQuerySchema = z.object({
  lng: z.coerce.number().min(-180).max(180).meta({
    description: 'Longitude (WGS 84)',
    example: -123.37,
  }),
  lat: z.coerce.number().min(-90).max(90).meta({
    description: 'Latitude (WGS 84)',
    example: 48.42,
  }),
})

export type LookupQuery = z.infer<typeof LookupQuerySchema>

export const LookupResponseSchema = ServiceAreaSchema.nullable().meta({
  id: 'ServiceAreaLookup',
  description:
    'Service area matching the given coordinates, or null if outside all boundaries',
})

export type LookupResponse = z.infer<typeof LookupResponseSchema>
