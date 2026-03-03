import { z } from 'zod'

export const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()))),
})

export const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(z.array(z.number())))),
})

export const PolygonGeometrySchema = z.discriminatedUnion('type', [
  PolygonSchema,
  MultiPolygonSchema,
])

export type PolygonGeometry = z.infer<typeof PolygonGeometrySchema>
