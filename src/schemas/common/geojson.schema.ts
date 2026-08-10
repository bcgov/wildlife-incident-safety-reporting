import { z } from 'zod'

export const PolygonSchema = z
  .object({
    type: z.literal('Polygon'),
    coordinates: z.array(z.array(z.array(z.number()))),
  })
  .meta({
    id: 'Polygon',
    description: 'GeoJSON Polygon, outer ring first followed by any holes',
  })

export const MultiPolygonSchema = z
  .object({
    type: z.literal('MultiPolygon'),
    coordinates: z.array(z.array(z.array(z.array(z.number())))),
  })
  .meta({
    id: 'MultiPolygon',
    description: 'GeoJSON MultiPolygon, an array of Polygon coordinate sets',
  })

export const LineStringSchema = z
  .object({
    type: z.literal('LineString'),
    coordinates: z.array(z.array(z.number())),
  })
  .meta({
    id: 'LineString',
    description: 'GeoJSON LineString, an ordered array of positions',
  })

export const MultiLineStringSchema = z
  .object({
    type: z.literal('MultiLineString'),
    coordinates: z.array(z.array(z.array(z.number()))),
  })
  .meta({
    id: 'MultiLineString',
    description:
      'GeoJSON MultiLineString, an array of LineString coordinate sets',
  })

export const PolygonGeometrySchema = z
  .discriminatedUnion('type', [PolygonSchema, MultiPolygonSchema])
  .meta({
    id: 'PolygonGeometry',
    description: 'Polygon or MultiPolygon, discriminated on type',
  })

export const LineGeometrySchema = z
  .discriminatedUnion('type', [LineStringSchema, MultiLineStringSchema])
  .meta({
    id: 'LineGeometry',
    description: 'LineString or MultiLineString, discriminated on type',
  })

export type PolygonGeometry = z.infer<typeof PolygonGeometrySchema>
export type LineGeometry = z.infer<typeof LineGeometrySchema>
