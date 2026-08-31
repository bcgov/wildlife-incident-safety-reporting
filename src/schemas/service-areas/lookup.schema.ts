import {
  LatitudeSchema,
  LongitudeSchema,
} from '@schemas/common/geojson.schema.js'
import { ServiceAreaSchema } from '@schemas/common/service-area.schema.js'
import { z } from 'zod'

export const LookupQuerySchema = z.object({
  lng: LongitudeSchema.meta({
    description: 'Longitude (WGS 84)',
    example: -123.37,
  }),
  lat: LatitudeSchema.meta({
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
