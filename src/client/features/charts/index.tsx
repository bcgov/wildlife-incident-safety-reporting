import type { Incident } from '@schemas/incidents/incidents.schema'
import { useMemo, useState } from 'react'
import type { DensityMode } from '@/features/map/store/layer-store'
import { useLayerStore } from '@/features/map/store/layer-store'
import { useDensityData } from '@/hooks/use-density-data'
import { useIncidents } from '@/hooks/use-incidents'
import type { DensitySegment } from '@/lib/density-api'
import type { DataViewOption } from '@/stores/data-view-store'
import { useDataViewStore } from '@/stores/data-view-store'
import { ChartToolbar } from './components/chart-toolbar'
import { DensityBarChart } from './components/density-bar-chart'
import { DensityKpiCards } from './components/density-kpi-cards'
import { DensityTable } from './components/density-table'
import { DensityToolbar } from './components/density-toolbar'
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
  summarizeDensity,
} from './lib/aggregations'
import type { TimeBucket } from './types/chart-types'

const EMPTY_BUCKET = { rows: [], speciesKeys: [] }
const EMPTY_INCIDENTS: Incident[] = []
const EMPTY_SEGMENTS: DensitySegment[] = []

const viewOptions: { id: DataViewOption; label: string }[] = [
  { id: 'incidents', label: 'Incidents' },
  { id: 'density', label: 'LKI Density' },
]

function ViewSwitcher() {
  const dataView = useDataViewStore((s) => s.dataView)
  const setDataView = useDataViewStore((s) => s.setDataView)

  return (
    <fieldset className="flex gap-1 border-none p-0" aria-label="Data view">
      {viewOptions.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setDataView(opt.id)}
          aria-pressed={dataView === opt.id}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            dataView === opt.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80 text-foreground'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </fieldset>
  )
}

function IncidentsView({
  incidents,
  isLoading,
}: {
  incidents: Incident[]
  isLoading: boolean
}) {
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
    <>
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
    </>
  )
}

function DensityView({
  segments,
  densityMode,
  onDensityModeChange,
  isLoading,
}: {
  segments: DensitySegment[]
  densityMode: DensityMode
  onDensityModeChange: (mode: DensityMode) => void
  isLoading: boolean
}) {
  const [highlightedSegment, setHighlightedSegment] = useState<string | null>(
    null,
  )

  const summary = useMemo(() => summarizeDensity(segments), [segments])

  if (segments.length === 0 && !isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">No density data available</p>
      </div>
    )
  }

  return (
    <>
      <DensityKpiCards summary={summary} isLoading={isLoading} />
      <DensityToolbar
        densityMode={densityMode}
        onDensityModeChange={onDensityModeChange}
      />
      <DensityBarChart
        segments={segments}
        densityMode={densityMode}
        isLoading={isLoading}
        onBarClick={(id) =>
          setHighlightedSegment((prev) => (prev === id ? null : id))
        }
      />
      <DensityTable
        segments={segments}
        densityMode={densityMode}
        isLoading={isLoading}
        highlightedSegment={highlightedSegment}
      />
    </>
  )
}

export function Component() {
  const dataView = useDataViewStore((s) => s.dataView)
  const densityMode = useLayerStore((s) => s.densityMode)
  const setDensityMode = useLayerStore((s) => s.setDensityMode)

  const { data: incidentResponse, isLoading: incidentsLoading } = useIncidents({
    enabled: dataView === 'incidents',
  })
  const incidents = incidentResponse?.data ?? EMPTY_INCIDENTS

  const { data: densityData, isLoading: densityLoading } = useDensityData({
    enabled: dataView === 'density',
  })
  const segments = densityData ?? EMPTY_SEGMENTS

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <ViewSwitcher />
      {dataView === 'incidents' ? (
        <IncidentsView incidents={incidents} isLoading={incidentsLoading} />
      ) : (
        <DensityView
          segments={segments}
          densityMode={densityMode}
          onDensityModeChange={setDensityMode}
          isLoading={densityLoading}
        />
      )}
    </div>
  )
}
