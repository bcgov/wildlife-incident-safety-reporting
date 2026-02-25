import { z } from 'zod'

export const AgeEnum = z.enum(['ADULT', 'YOUNG', 'UNKNOWN']).meta({
  id: 'Age',
  description: 'Age classification of the animal',
  example: 'ADULT',
})

export const SexEnum = z.enum(['MALE', 'FEMALE', 'UNKNOWN']).meta({
  id: 'Sex',
  description: 'Biological sex of the animal',
  example: 'MALE',
})

export const TimeOfKillEnum = z
  .enum(['DAY', 'DAWN', 'DUSK', 'DARK', 'UNKNOWN'])
  .meta({
    id: 'TimeOfKill',
    description: 'Approximate time of day the incident occurred',
    example: 'DAY',
  })
