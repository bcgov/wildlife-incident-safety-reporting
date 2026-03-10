import { PolygonGeometrySchema } from '@schemas/common/geojson.schema.js'
import { ServiceAreaSchema } from '@schemas/service-areas/service-area.schema.js'
import { z } from 'zod'

export const BoundaryPropertiesSchema = ServiceAreaSchema

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
