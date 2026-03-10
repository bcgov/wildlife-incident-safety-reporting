import {
  AgeEnum,
  SexEnum,
  TimeOfKillEnum,
} from '@schemas/common/enums.schema.js'
import { SpeciesSchema } from '@schemas/common/species.schema.js'
import { ServiceAreaSchema } from '@schemas/service-areas/service-area.schema.js'
import { z } from 'zod'

export const IncidentFiltersResponseSchema = z.object({
  years: z.array(z.number().int().positive()),
  species: z.array(SpeciesSchema),
  serviceAreas: z.array(ServiceAreaSchema),
  sex: z.array(SexEnum),
  timeOfKill: z.array(TimeOfKillEnum),
  age: z.array(AgeEnum),
  dateRange: z.object({
    min: z.iso.date().nullable(),
    max: z.iso.date().nullable(),
  }),
})

export type IncidentFiltersResponse = z.infer<
  typeof IncidentFiltersResponseSchema
>
