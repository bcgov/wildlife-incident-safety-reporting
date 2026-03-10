import { z } from 'zod'

export const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()))),
})

export const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(z.array(z.number())))),
})

export const LineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.array(z.number())),
})

export const MultiLineStringSchema = z.object({
  type: z.literal('MultiLineString'),
  coordinates: z.array(z.array(z.array(z.number()))),
})

export const PolygonGeometrySchema = z.discriminatedUnion('type', [
  PolygonSchema,
  MultiPolygonSchema,
])

export const LineGeometrySchema = z.discriminatedUnion('type', [
  LineStringSchema,
  MultiLineStringSchema,
])

export type PolygonGeometry = z.infer<typeof PolygonGeometrySchema>
export type LineGeometry = z.infer<typeof LineGeometrySchema>
