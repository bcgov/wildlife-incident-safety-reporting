export type SpeciesCount = {
  speciesGroupName: string
  color: string
  count: number
  percentage: number
}

export type KpiSummary = {
  totalCount: number
  uniqueSpecies: number
  topSpecies: { name: string; count: number; percentage: number } | null
}

export type TimeBucket = 'year' | 'month' | 'seasonal'

// Each row is a time bucket with a key per species holding its quantity sum.
// e.g. { label: "2023", total: 450, Deer: 150, Bear: 45, ... }
export type TimeBucketRow = {
  label: string
  total: number
  [species: string]: string | number
}

// Heatmap row: 12-element array where index 0 = Jan, 11 = Dec
export type SeasonalHeatmapRow = {
  speciesGroupName: string
  color: string
  months: number[]
}

export type DensityKpiSummary = {
  segmentsWithData: number
  highestSegment: { name: string; value: number } | null
  averageDensity: number | null
}
