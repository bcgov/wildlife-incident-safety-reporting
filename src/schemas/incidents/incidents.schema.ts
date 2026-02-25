import {
  AgeEnum,
  SexEnum,
  TimeOfKillEnum,
} from '@schemas/common/enums.schema.js'
import { ErrorSchema } from '@schemas/common/error.schema.js'
import {
  PaginationQuerySchema,
  paginatedResponse,
} from '@schemas/common/pagination.schema.js'
import type { Geometry } from 'geojson'
import { z } from 'zod'

// Comma-separated string to array of numbers
const commaNumbers = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .map(Number),
  )
  .pipe(z.array(z.number().int()))

// Comma-separated string to array of strings (trimmed)
const commaStrings = z.string().transform((s) =>
  s
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0),
)

const geometryTypes = [
  'Point',
  'MultiPoint',
  'LineString',
  'MultiLineString',
  'Polygon',
  'MultiPolygon',
  'GeometryCollection',
] as const

// Parse GeoJSON string into a typed Geometry object
const geoJsonString = z
  .string()
  .transform((s, ctx) => {
    try {
      return JSON.parse(s) as Record<string, unknown>
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' })
      return z.NEVER
    }
  })
  .pipe(
    z.object({
      type: z.enum(geometryTypes),
      coordinates: z.array(z.unknown()).optional(),
      geometries: z.array(z.unknown()).optional(),
    }),
  )
  .transform((v) => v as unknown as Geometry)

export const IncidentsQuerySchema = z
  .object({
    year: commaNumbers.optional().meta({
      override: {
        type: 'string',
        description: 'Comma-separated list of years (e.g. 2020,2021)',
        example: '2020,2021',
      },
    }),
    species: commaNumbers.optional().meta({
      override: {
        type: 'string',
        description: 'Comma-separated list of species IDs (e.g. 10,18)',
        example: '10,18',
      },
    }),
    serviceArea: commaNumbers.optional().meta({
      override: {
        type: 'string',
        description: 'Comma-separated list of service area IDs (e.g. 16,17)',
        example: '16,17',
      },
    }),
    sex: commaStrings
      .pipe(z.array(SexEnum))
      .optional()
      .meta({
        override: {
          type: 'string',
          description: 'Comma-separated list: MALE, FEMALE, UNKNOWN',
          example: 'MALE,FEMALE',
        },
      }),
    timeOfKill: commaStrings
      .pipe(z.array(TimeOfKillEnum))
      .optional()
      .meta({
        override: {
          type: 'string',
          description: 'Comma-separated list: DAY, DAWN, DUSK, DARK, UNKNOWN',
          example: 'DAY,DAWN',
        },
      }),
    age: commaStrings
      .pipe(z.array(AgeEnum))
      .optional()
      .meta({
        override: {
          type: 'string',
          description: 'Comma-separated list: ADULT, YOUNG, UNKNOWN',
          example: 'ADULT,YOUNG',
        },
      }),
    startDate: z.iso.date().optional().meta({
      description: 'Start date filter (inclusive, YYYY-MM-DD)',
      example: '2021-01-01',
    }),
    endDate: z.iso.date().optional().meta({
      description: 'End date filter (inclusive, YYYY-MM-DD)',
      example: '2021-12-31',
    }),
    geometry: geoJsonString.optional().meta({
      override: {
        type: 'string',
        description:
          'GeoJSON geometry string for spatial filtering (e.g. Polygon)',
        example:
          '{"type":"Polygon","coordinates":[[[-123.2,49.2],[-123.0,49.2],[-123.0,49.3],[-123.2,49.3],[-123.2,49.2]]]}',
      },
    }),
  })
  .merge(PaginationQuerySchema)

export type IncidentsQuery = z.infer<typeof IncidentsQuerySchema>

export const IncidentSchema = z
  .object({
    id: z.number(),
    year: z.number(),
    accidentDate: z.string().nullable(),
    speciesId: z.number(),
    speciesName: z.string(),
    speciesColor: z.string(),
    speciesGroupName: z.string(),
    serviceAreaId: z.number().nullable(),
    serviceAreaName: z.string().nullable(),
    contractAreaNumber: z.number().nullable(),
    sex: SexEnum.nullable(),
    timeOfKill: TimeOfKillEnum.nullable(),
    age: AgeEnum.nullable(),
    quantity: z.number().int().positive(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    nearestTown: z.string().nullable(),
  })
  .meta({ id: 'Incident', description: 'A wildlife-vehicle collision record' })

export type Incident = z.infer<typeof IncidentSchema>

export const IncidentsResponseSchema = paginatedResponse(IncidentSchema)

export type IncidentsResponse = z.infer<typeof IncidentsResponseSchema>

export const IncidentErrorSchema = ErrorSchema
