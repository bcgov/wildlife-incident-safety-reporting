import type { Age, Sex, TimeOfKill } from './database.js'

export interface HmcrUpsertRow {
  hmcr_record_id: number
  accident_date: string | null
  time_of_kill: string | null
  nearest_town: string | null
  sex: string | null
  age: string | null
  comments: string | null
  quantity: number
  latitude: number | null
  longitude: number | null
  species_id: number
  year: number
}

// Must match the column definition list on the jsonb_to_recordset expansion in upsertHmcrIncidents.
export interface HmcrIncomingRow {
  hmcr_record_id: number
  accident_date: Date | null
  time_of_kill: TimeOfKill | null
  nearest_town: string | null
  sex: Sex | null
  age: Age | null
  comments: string | null
  quantity: number
  latitude: string | null
  longitude: string | null
  species_id: number
  year: number
}
