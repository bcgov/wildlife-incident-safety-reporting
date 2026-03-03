import { PolygonGeometrySchema } from '@schemas/common/geojson.schema.js'
import { z } from 'zod'

export const BoundaryPropertiesSchema = z.object({
  id: z.number(),
  name: z.string(),
  contractAreaNumber: z.number(),
  district: z.string(),
  region: z.string(),
})

export type BoundaryProperties = z.infer<typeof BoundaryPropertiesSchema>

export const BoundaryFeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: PolygonGeometrySchema,
  properties: BoundaryPropertiesSchema,
})

export type BoundaryFeature = z.infer<typeof BoundaryFeatureSchema>

export const BoundariesResponseSchema = z
  .object({
    type: z.literal('FeatureCollection'),
    features: z.array(BoundaryFeatureSchema),
  })
  .meta({
    id: 'ServiceAreaBoundaries',
    description: 'GeoJSON FeatureCollection of service area boundary polygons',
  })

export type BoundariesResponse = z.infer<typeof BoundariesResponseSchema>
