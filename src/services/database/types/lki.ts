export interface LkiUpsertRow {
  chris_lki_segment_id: number
  lki_segment_name: string
  lki_segment_description: string | null
  lki_segment_direction: string | null
  lki_segment_length: number | null
  lki_route_id: string | null
  highway_number: string | null
  geom: string
  feature_length_m: number | null
  objectid: number | null
}

// Mirrors the temp tables upsertLkiSegments creates.
export interface LkiBeforeRow {
  chris_lki_segment_id: number
  geom: string
}

export interface LkiChangedRow {
  geom: string
}
