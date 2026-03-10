import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import type { DensityMode } from '@/features/map/store/layer-store'
import type { DensitySegment } from '@/lib/density-api'
import { DENSITY_COLORS } from '@/lib/density-colors'

const TOP_N = 15

// Absolute breakpoints matching the map layer color ramp
const WEIGHTED_STOPS = [7, 25, 50, 72]
const RAW_STOPS = [2.3, 7, 12, 16]

function getDensityColor(value: number, mode: DensityMode): string {
  const stops = mode === 'weighted' ? WEIGHTED_STOPS : RAW_STOPS
  for (let i = stops.length - 1; i >= 0; i--) {
    if (value >= stops[i]) return DENSITY_COLORS[i]
  }
  return DENSITY_COLORS[0]
}

type BarRow = {
  name: string
  value: number
  fill: string
}

type DensityBarChartProps = {
  segments: DensitySegment[]
  densityMode: DensityMode
  isLoading: boolean
  onBarClick?: (segmentName: string) => void
}

export function DensityBarChart({
  segments,
  densityMode,
  isLoading,
  onBarClick,
}: DensityBarChartProps) {
  const chartHeight = 'clamp(280px, 30vh, 450px)'

  const { data, config, description } = useMemo(() => {
    const ranked = segments
      .map((s) => ({
        name: s.segmentName,
        value:
          densityMode === 'weighted'
            ? (s.densityPerKm ?? 0)
            : s.segmentLengthKm && s.segmentLengthKm > 0
              ? Math.round((s.totalAnimals / s.segmentLengthKm) * 100) / 100
              : 0,
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, TOP_N)

    const rows: BarRow[] = ranked.reverse().map((r) => ({
      name: r.name,
      value: r.value,
      fill: getDensityColor(r.value, densityMode),
    }))

    const cfg: ChartConfig = {
      value: {
        label: densityMode === 'weighted' ? 'Weighted/km' : 'Animals/km',
      },
    }

    const desc =
      densityMode === 'weighted'
        ? `Top ${TOP_N} segments by weighted density per km`
        : `Top ${TOP_N} segments by raw animal count per km`

    return { data: rows, config: cfg, description: desc }
  }, [segments, densityMode])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Segments</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="w-full" style={{ height: chartHeight }} />
        ) : data.length === 0 ? (
          <p
            className="text-muted-foreground flex items-center justify-center text-center"
            style={{ height: chartHeight }}
          >
            No data available
          </p>
        ) : (
          <ChartContainer
            config={config}
            className="w-full"
            style={{ height: chartHeight }}
          >
            <BarChart data={data} layout="vertical">
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={120}
                fontSize={11}
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y}
                    dy={4}
                    textAnchor="end"
                    fontSize={11}
                    fill="currentColor"
                    className="text-muted-foreground"
                  >
                    {payload.value.length > 18
                      ? `${payload.value.slice(0, 16)}...`
                      : payload.value}
                  </text>
                )}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value) =>
                      `${Number(value).toFixed(1)} ${densityMode === 'weighted' ? 'weighted/km' : 'animals/km'}`
                    }
                  />
                }
              />
              <Bar
                dataKey="value"
                maxBarSize={24}
                radius={[0, 4, 4, 0]}
                cursor={onBarClick ? 'pointer' : undefined}
                onClick={(entry) => {
                  if (onBarClick && entry?.name) {
                    onBarClick(String(entry.name))
                  }
                }}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
