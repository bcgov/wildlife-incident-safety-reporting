import type { Incident } from '@schemas/incidents/incidents.schema'
import type { ChartConfig } from '@/components/ui/chart'
import type { DensitySegment } from '@/lib/density-api'
import type {
  DensityKpiSummary,
  KpiSummary,
  SeasonalHeatmapRow,
  SpeciesCount,
  TimeBucket,
  TimeBucketRow,
} from '../types/chart-types'

export const REMAINING_KEY = 'Remaining'
export const MAX_YEARS_FOR_MONTHLY = 3
const REMAINING_COLOR = '#94a3b8' // slate-400
const MAX_SPECIES_PER_BAR = 9

export function summarize(incidents: Incident[]): KpiSummary {
  const counts = countBySpeciesGroup(incidents)
  const totalCount = counts.reduce((sum, c) => sum + c.count, 0)
  const uniqueSpecies = counts.length

  const top = counts[0] ?? null
  const topSpecies = top
    ? {
        name: top.speciesGroupName,
        count: top.count,
        percentage: top.percentage,
      }
    : null

  return { totalCount, uniqueSpecies, topSpecies }
}

export function countBySpeciesGroup(incidents: Incident[]): SpeciesCount[] {
  const groups = new Map<string, { color: string; count: number }>()
  let totalQuantity = 0

  for (const incident of incidents) {
    const key = incident.speciesGroupName
    totalQuantity += incident.quantity
    const existing = groups.get(key)
    if (existing) {
      existing.count += incident.quantity
    } else {
      groups.set(key, {
        color: incident.speciesColor,
        count: incident.quantity,
      })
    }
  }

  return [...groups.entries()]
    .map(([speciesGroupName, { color, count }]) => ({
      speciesGroupName,
      color,
      count,
      percentage: totalQuantity > 0 ? (count / totalQuantity) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export function countByTimeBucket(
  incidents: Incident[],
  bucket: TimeBucket,
): { rows: TimeBucketRow[]; speciesKeys: string[] } {
  // First pass: accumulate raw species counts per time bucket
  const rawBuckets = new Map<string, Map<string, number>>()

  for (const incident of incidents) {
    const key = toBucketKey(incident, bucket)
    if (!key) continue

    let speciesMap = rawBuckets.get(key)
    if (!speciesMap) {
      speciesMap = new Map()
      rawBuckets.set(key, speciesMap)
    }
    const prev = speciesMap.get(incident.speciesGroupName) ?? 0
    speciesMap.set(incident.speciesGroupName, prev + incident.quantity)
  }

  // Per-bar binning: keep top 9 species, group the rest as Remaining
  const allSpeciesKeys = new Set<string>()
  let hasRemaining = false

  const rows = [...rawBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, speciesMap]) => {
      const row: TimeBucketRow = {
        label: formatBucketLabel(key, bucket),
        total: 0,
      }

      // Sort species by count descending within this bar
      const sorted = [...speciesMap.entries()].sort(([, a], [, b]) => b - a)

      let remainingSum = 0
      for (let i = 0; i < sorted.length; i++) {
        const [species, count] = sorted[i]
        if (i < MAX_SPECIES_PER_BAR) {
          row[species] = count
          allSpeciesKeys.add(species)
        } else {
          remainingSum += count
        }
        row.total += count
      }

      if (remainingSum > 0) {
        row[REMAINING_KEY] = remainingSum
        hasRemaining = true
      }

      return row
    })

  // Sort species keys by overall total descending, Remaining last
  const globalTotals = new Map<string, number>()
  for (const speciesMap of rawBuckets.values()) {
    for (const [species, count] of speciesMap) {
      globalTotals.set(species, (globalTotals.get(species) ?? 0) + count)
    }
  }

  const speciesKeys = [...allSpeciesKeys].sort((a, b) => {
    return (globalTotals.get(b) ?? 0) - (globalTotals.get(a) ?? 0)
  })

  if (hasRemaining) {
    speciesKeys.push(REMAINING_KEY)
  }

  return { rows, speciesKeys }
}

function toBucketKey(incident: Incident, bucket: TimeBucket): string | null {
  if (incident.accidentDate) {
    // Parse the "YYYY-MM-DD" string directly to avoid Date timezone issues
    const [year, month] = incident.accidentDate.split('-')
    if (bucket === 'year') return year
    return `${year}-${month}`
  }
  if (bucket === 'year') return String(incident.year)
  return null
}

function formatBucketLabel(key: string, bucket: TimeBucket): string {
  if (bucket === 'year') return key
  // Key is already "YYYY-MM" from toBucketKey, format for display
  const [year, month] = key.split('-')
  const date = new Date(Date.UTC(Number(year), Number(month) - 1))
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function countBySeason(incidents: Incident[]): {
  rows: SeasonalHeatmapRow[]
  speciesKeys: string[]
} {
  const groups = new Map<string, { color: string; months: number[] }>()

  for (const incident of incidents) {
    if (!incident.accidentDate) continue
    if (incident.speciesGroupName.toUpperCase() === 'UNKNOWN') continue

    const monthStr = incident.accidentDate.split('-')[1]
    const monthIndex = Number(monthStr) - 1
    if (monthIndex < 0 || monthIndex > 11) continue

    const key = incident.speciesGroupName
    let group = groups.get(key)
    if (!group) {
      group = { color: incident.speciesColor, months: new Array(12).fill(0) }
      groups.set(key, group)
    }
    group.months[monthIndex] += incident.quantity
  }

  const speciesKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b))

  const rows: SeasonalHeatmapRow[] = speciesKeys.map((name) => {
    const group = groups.get(name)
    return {
      speciesGroupName: name,
      color: group?.color ?? REMAINING_COLOR,
      months: group?.months ?? new Array(12).fill(0),
    }
  })

  return { rows, speciesKeys }
}

export function buildChartConfig(
  incidents: Incident[],
  speciesKeys: string[],
): ChartConfig {
  const colorMap = new Map<string, string>()
  for (const incident of incidents) {
    if (!colorMap.has(incident.speciesGroupName)) {
      colorMap.set(incident.speciesGroupName, incident.speciesColor)
    }
  }

  const config: ChartConfig = {}
  for (const key of speciesKeys) {
    if (key === REMAINING_KEY) {
      config[key] = { label: REMAINING_KEY, color: REMAINING_COLOR }
    } else {
      config[key] = { label: key, color: colorMap.get(key) }
    }
  }
  return config
}

export function summarizeDensity(
  segments: DensitySegment[],
): DensityKpiSummary {
  const withData = segments.filter((s) => s.totalAnimals > 0)
  const segmentsWithData = withData.length

  let highestSegment: { name: string; value: number } | null = null
  let densitySum = 0
  let densityCount = 0

  for (const s of withData) {
    if (s.densityPerKm != null) {
      densitySum += s.densityPerKm
      densityCount++
      if (!highestSegment || s.densityPerKm > highestSegment.value) {
        highestSegment = { name: s.segmentName, value: s.densityPerKm }
      }
    }
  }

  const averageDensity = densityCount > 0 ? densitySum / densityCount : null

  return { segmentsWithData, highestSegment, averageDensity }
}
