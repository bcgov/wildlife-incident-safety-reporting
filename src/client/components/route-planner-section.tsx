import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { RouteLocationInput } from '@/components/route-location-input'
import { Label } from '@/components/ui/label'
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useRoute } from '@/hooks/use-route'
import { useFilterStore } from '@/stores/filter-store'
import { useRouteStore } from '@/stores/route-store'

export function RoutePlannerSection() {
  const start = useRouteStore((s) => s.start)
  const end = useRouteStore((s) => s.end)
  const corridorMeters = useRouteStore((s) => s.corridorMeters)
  const setStart = useRouteStore((s) => s.setStart)
  const setEnd = useRouteStore((s) => s.setEnd)
  const setCorridorMeters = useRouteStore((s) => s.setCorridorMeters)
  const clearRoute = useRouteStore((s) => s.clearRoute)

  const geometry = useFilterStore((s) => s.geometry)
  const setRouteFilter = useFilterStore((s) => s.setRouteFilter)

  const { data, isFetching, isError } = useRoute()
  const line = data?.line ?? null
  const debouncedMeters = useDebouncedValue(corridorMeters, 400)

  // A resolved route becomes the corridor filter, displacing any drawn shape;
  // the server rebuilds the same route and filters with ST_DWithin
  useEffect(() => {
    const { start: s, end: e } = useRouteStore.getState()
    if (line && s && e && debouncedMeters > 0) {
      setRouteFilter({
        startLng: s.longitude,
        startLat: s.latitude,
        endLng: e.longitude,
        endLat: e.latitude,
        // The input clamps on blur, but the debounce can send mid-typing
        // values the query schema would reject
        corridorMeters: Math.min(debouncedMeters, 20_000),
      })
    } else if (useFilterStore.getState().routeFilter) {
      setRouteFilter(null)
    }
  }, [line, debouncedMeters, setRouteFilter])

  // A drawn shape displaces the corridor, leaving the route inputs stale
  useEffect(() => {
    if (geometry) clearRoute()
  }, [geometry, clearRoute])

  return (
    <SidebarGroup className="px-2 py-1">
      <SidebarGroupLabel>Route</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-1.5">
        <RouteLocationInput
          placeholder="Start location..."
          value={start}
          onSelect={setStart}
        />
        <RouteLocationInput
          placeholder="End location..."
          value={end}
          onSelect={setEnd}
        />
        <NumberField
          value={corridorMeters}
          onValueChange={(next) => {
            if (next !== null) setCorridorMeters(next)
          }}
          min={50}
          max={20_000}
          step={50}
          className="flex-row items-center justify-between gap-2"
        >
          <Label
            htmlFor="route-corridor-width"
            className="shrink-0 font-normal text-muted-foreground text-xs"
          >
            Corridor width (m)
          </Label>
          <NumberFieldGroup className="w-32">
            <NumberFieldDecrement />
            <NumberFieldInput id="route-corridor-width" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
        {isFetching && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Finding route...
          </div>
        )}
        {isError && (
          <p className="text-xs text-destructive">
            Failed to fetch route. Please try again.
          </p>
        )}
        {data && !isFetching && (
          <p className="text-xs text-muted-foreground">
            {data.routeFound && data.line
              ? `${data.distance.toFixed(1)} ${data.distanceUnit} route`
              : 'No route found between these points.'}
          </p>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
