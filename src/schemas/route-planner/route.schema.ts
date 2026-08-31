import {
  LatitudeSchema,
  LineStringSchema,
  LongitudeSchema,
} from '@schemas/common/geojson.schema.js'
import { z } from 'zod'

export const RouteQuerySchema = z.object({
  startLng: LongitudeSchema.meta({
    description: 'Longitude of the route start point',
  }),
  startLat: LatitudeSchema.meta({
    description: 'Latitude of the route start point',
  }),
  endLng: LongitudeSchema.meta({
    description: 'Longitude of the route end point',
  }),
  endLat: LatitudeSchema.meta({
    description: 'Latitude of the route end point',
  }),
})

export type RouteQuery = z.infer<typeof RouteQuerySchema>

export const RouteResponseSchema = z
  .object({
    routeFound: z.boolean(),
    distance: z.number().nonnegative(),
    distanceUnit: z.string(),
    time: z.number().nonnegative(),
    timeText: z.string(),
    line: LineStringSchema.nullable(),
  })
  .meta({
    id: 'Route',
    description: 'Road route between two points from the BC Route Planner',
  })

export type RouteResponse = z.infer<typeof RouteResponseSchema>

export type RouteLine = z.infer<typeof LineStringSchema>
