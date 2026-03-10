import {
  AgeEnum,
  SexEnum,
  TimeOfKillEnum,
} from '@schemas/common/enums.schema.js'
import { ErrorSchema } from '@schemas/common/error.schema.js'
import {
  dateRangeMessage,
  dateRangeRefinement,
  IncidentFilterFields,
} from '@schemas/common/incident-query.schema.js'
import {
  PaginationQuerySchema,
  paginatedResponse,
} from '@schemas/common/pagination.schema.js'
import { z } from 'zod'

export const IncidentsQuerySchema = IncidentFilterFields.merge(
  PaginationQuerySchema,
).refine(dateRangeRefinement, dateRangeMessage)

export type IncidentsQuery = z.infer<typeof IncidentsQuerySchema>

export const IncidentSchema = z
  .object({
    id: z.number().int().positive(),
    year: z.number().int().positive(),
    accidentDate: z.string().nullable(),
    speciesId: z.number().int().positive(),
    speciesName: z.string(),
    speciesColor: z.string(),
    speciesGroupName: z.string(),
    serviceAreaId: z.number().int().positive().nullable(),
    serviceAreaName: z.string().nullable(),
    contractAreaNumber: z.number().int().positive().nullable(),
    district: z.string().nullable(),
    region: z.string().nullable(),
    sex: SexEnum.nullable(),
    timeOfKill: TimeOfKillEnum.nullable(),
    age: AgeEnum.nullable(),
    quantity: z.number().int().positive(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    nearestTown: z.string().nullable(),
    comments: z.string(),
  })
  .meta({ id: 'Incident', description: 'A wildlife-vehicle collision record' })

export type Incident = z.infer<typeof IncidentSchema>

export const IncidentsResponseSchema = paginatedResponse(IncidentSchema)

export type IncidentsResponse = z.infer<typeof IncidentsResponseSchema>

export const IncidentErrorSchema = ErrorSchema
