import type { Incident } from '@schemas/incidents/incidents.schema'
import { useMemo, useState } from 'react'
import { useIncidents } from '@/hooks/use-incidents'
import { ChartToolbar } from './components/chart-toolbar'
import { IncidentsTable } from './components/incidents-table'
import { KpiCards } from './components/kpi-cards'
import { SeasonalHeatmap } from './components/seasonal-heatmap'
import { SpeciesBarChart } from './components/species-bar-chart'
import {
  buildChartConfig,
  countBySeason,
  countByTimeBucket,
  MAX_YEARS_FOR_MONTHLY,
  summarize,
} from './lib/aggregations'
import type { TimeBucket } from './types/chart-types'

const EMPTY_BUCKET = { rows: [], speciesKeys: [] }
const EMPTY_INCIDENTS: Incident[] = []

export function Component() {
  const { data: response, isLoading } = useIncidents()
  const incidents = response?.data ?? EMPTY_INCIDENTS
  const hasData = incidents.length > 0
  const [bucket, setBucket] = useState<TimeBucket>('year')

  const summary = useMemo(() => summarize(incidents), [incidents])

  const byYear = useMemo(
    () => countByTimeBucket(incidents, 'year'),
    [incidents],
  )

  const yearCount = byYear.rows.length
  const monthlyAllowed = yearCount <= MAX_YEARS_FOR_MONTHLY

  const byMonth = useMemo(
    () =>
      monthlyAllowed ? countByTimeBucket(incidents, 'month') : EMPTY_BUCKET,
    [incidents, monthlyAllowed],
  )

  const bySeasonal = useMemo(() => countBySeason(incidents), [incidents])

  const barDataByBucket = useMemo(
    () => ({ year: byYear, month: byMonth }),
    [byYear, byMonth],
  )

  const barData = bucket === 'seasonal' ? byYear : barDataByBucket[bucket]
  const { rows, speciesKeys } = barData

  const allSpeciesKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const bucketData of Object.values(barDataByBucket)) {
      for (const k of bucketData.speciesKeys) keys.add(k)
    }
    for (const k of bySeasonal.speciesKeys) keys.add(k)
    return [...keys]
  }, [barDataByBucket, bySeasonal])

  const chartConfig = useMemo(
    () => buildChartConfig(incidents, allSpeciesKeys),
    [incidents, allSpeciesKeys],
  )

  const monthlyUnavailable = bucket === 'month' && !monthlyAllowed

  if (!hasData && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Select filters to view data</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <KpiCards summary={summary} isLoading={isLoading} />
      <ChartToolbar
        bucket={bucket}
        onBucketChange={setBucket}
        speciesKeys={speciesKeys}
        config={chartConfig}
      />
      {bucket === 'seasonal' ? (
        <SeasonalHeatmap data={bySeasonal.rows} isLoading={isLoading} />
      ) : (
        <SpeciesBarChart
          data={rows}
          speciesKeys={speciesKeys}
          config={chartConfig}
          isLoading={isLoading}
          monthlyUnavailable={monthlyUnavailable}
        />
      )}
      <IncidentsTable incidents={incidents} isLoading={isLoading} />
    </div>
  )
}
