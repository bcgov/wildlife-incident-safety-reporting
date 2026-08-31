import { LineGeometrySchema } from '@schemas/common/geojson.schema.js'
import { IncidentFilterQuerySchema } from '@schemas/common/incident-query.schema.js'
import { z } from 'zod'

export const DensityQuerySchema = IncidentFilterQuerySchema

export type DensityQuery = z.infer<typeof DensityQuerySchema>

export const DensitySegmentSchema = z
  .object({
    segmentId: z.number().int().positive(),
    segmentName: z.string(),
    segmentDescription: z.string().nullable(),
    highwayNumber: z.string().nullable(),
    segmentLengthKm: z.number().positive().nullable(),
    geometry: LineGeometrySchema,
    small: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    large: z.number().int().nonnegative(),
    totalAnimals: z.number().int().nonnegative(),
    weighted: z.number().nonnegative(),
    densityPerKm: z.number().nonnegative().nullable(),
  })
  .meta({
    id: 'DensitySegment',
    description: 'LKI highway segment with incident density counts',
  })

export const DensityResponseSchema = z.array(DensitySegmentSchema).meta({
  id: 'LkiDensity',
  description: 'Per-segment incident density for the current filters',
})

export type DensityResponse = z.infer<typeof DensityResponseSchema>
