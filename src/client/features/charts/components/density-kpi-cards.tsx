import { MapPin, Ruler, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DensityKpiSummary } from '../types/chart-types'

type DensityKpiCardsProps = {
  summary: DensityKpiSummary
  isLoading: boolean
}

export function DensityKpiCards({ summary, isLoading }: DensityKpiCardsProps) {
  const { segmentsWithData, highestSegment, averageDensity } = summary

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Segments with Data</CardTitle>
            <MapPin className="text-muted-foreground size-4" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {segmentsWithData.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Highest Density</CardTitle>
            <TrendingUp className="text-muted-foreground size-4" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ) : highestSegment ? (
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {highestSegment.name}
              </p>
              <p className="text-muted-foreground text-sm">
                {highestSegment.value.toFixed(1)} weighted/km
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Avg Density/km</CardTitle>
            <Ruler className="text-muted-foreground size-4" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : averageDensity != null ? (
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {averageDensity.toFixed(1)}
            </p>
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
