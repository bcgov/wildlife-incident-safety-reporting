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
