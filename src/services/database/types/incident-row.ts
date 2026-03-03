import type { Age, Sex, TimeOfKill } from './database.js'

// Joined result from wars_incidents + species + service_areas.
// Not a repeat of codegen types - those are per-table. This represents
// the flattened shape after joins with aliased columns.
export interface IncidentRow {
  id: number
  year: number
  accident_date: Date | null
  species_id: number
  species_name: string
  species_color: string
  species_group_name: string
  service_area_id: number | null
  service_area_name: string | null
  contract_area_number: number | null
  district: string | null
  region: string | null
  sex: Sex | null
  time_of_kill: TimeOfKill | null
  age: Age | null
  quantity: number
  latitude: string | null
  longitude: string | null
  nearest_town: string | null
  comments: string | null
}
