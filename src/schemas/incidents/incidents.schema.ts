import {
  AgeEnum,
  SexEnum,
  TimeOfKillEnum,
} from '@schemas/common/enums.schema.js'
import { ErrorSchema } from '@schemas/common/error.schema.js'
import { PolygonGeometrySchema } from '@schemas/common/geojson.schema.js'
import {
  PaginationQuerySchema,
  paginatedResponse,
} from '@schemas/common/pagination.schema.js'
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

// Parse a GeoJSON geometry string from drawing tools (Polygon or MultiPolygon)
const geoJsonString = z
  .string()
  .transform((s, ctx) => {
    try {
      return JSON.parse(s)
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' })
      return z.NEVER
    }
  })
  .pipe(PolygonGeometrySchema)

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
        description:
          'Comma-separated species IDs from GET /v1/incidents/filters',
        example: '10,18',
      },
    }),
    serviceArea: commaNumbers.optional().meta({
      override: {
        type: 'string',
        description:
          'Comma-separated service area IDs from GET /v1/incidents/filters',
        example: '16,17',
      },
    }),
    sex: commaStrings
      .pipe(z.array(SexEnum))
      .optional()
      .meta({
        override: {
          type: 'string',
          description: 'Comma-separated values: MALE, FEMALE, UNKNOWN',
          example: 'MALE,FEMALE,UNKNOWN',
        },
      }),
    timeOfKill: commaStrings
      .pipe(z.array(TimeOfKillEnum))
      .optional()
      .meta({
        override: {
          type: 'string',
          description: 'Comma-separated values: DAY, DAWN, DUSK, DARK, UNKNOWN',
          example: 'DAY,DAWN,DUSK,DARK,UNKNOWN',
        },
      }),
    age: commaStrings
      .pipe(z.array(AgeEnum))
      .optional()
      .meta({
        override: {
          type: 'string',
          description: 'Comma-separated values: ADULT, YOUNG, UNKNOWN',
          example: 'ADULT,YOUNG,UNKNOWN',
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
    district: z.string().nullable(),
    region: z.string().nullable(),
    sex: SexEnum.nullable(),
    timeOfKill: TimeOfKillEnum.nullable(),
    age: AgeEnum.nullable(),
    quantity: z.number().int().positive(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    nearestTown: z.string().nullable(),
    comments: z.string(),
  })
  .meta({ id: 'Incident', description: 'A wildlife-vehicle collision record' })

export type Incident = z.infer<typeof IncidentSchema>

export const IncidentsResponseSchema = paginatedResponse(IncidentSchema)

export type IncidentsResponse = z.infer<typeof IncidentsResponseSchema>

export const IncidentErrorSchema = ErrorSchema
