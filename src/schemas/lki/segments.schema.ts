import { LineGeometrySchema } from '@schemas/common/geojson.schema.js'
import { z } from 'zod'

export const LkiSegmentSchema = z
  .object({
    segmentId: z.number().int().positive(),
    segmentName: z.string(),
    segmentDescription: z.string().nullable(),
    highwayNumber: z.string().nullable(),
    segmentLengthKm: z.number().positive().nullable(),
    geometry: LineGeometrySchema,
  })
  .meta({
    id: 'LkiSegment',
    description: 'LKI highway segment with its geometry',
  })

export const LkiSegmentsResponseSchema = z.array(LkiSegmentSchema).meta({
  id: 'LkiSegments',
  description: 'All LKI highway segments',
})

export type LkiSegmentsResponse = z.infer<typeof LkiSegmentsResponseSchema>
