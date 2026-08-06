import { LineStringSchema } from '@schemas/common/geojson.schema.js'
import { z } from 'zod'

export const DEFAULT_CORRIDOR_METERS = 250
export const MAX_CORRIDOR_METERS = 20_000

export const RouteQuerySchema = z.object({
  startLng: z.coerce.number().min(-180).max(180).meta({
    description: 'Longitude of the route start point',
  }),
  startLat: z.coerce.number().min(-90).max(90).meta({
    description: 'Latitude of the route start point',
  }),
  endLng: z.coerce.number().min(-180).max(180).meta({
    description: 'Longitude of the route end point',
  }),
  endLat: z.coerce.number().min(-90).max(90).meta({
    description: 'Latitude of the route end point',
  }),
})

export type RouteQuery = z.infer<typeof RouteQuerySchema>

export const RouteResponseSchema = z.object({
  routeFound: z.boolean(),
  distance: z.number().nonnegative(),
  distanceUnit: z.string(),
  time: z.number().nonnegative(),
  timeText: z.string(),
  line: LineStringSchema.nullable(),
})

export type RouteResponse = z.infer<typeof RouteResponseSchema>

export type RouteLine = z.infer<typeof LineStringSchema>
