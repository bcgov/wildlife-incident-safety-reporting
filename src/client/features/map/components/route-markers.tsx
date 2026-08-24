import { MapMarker, MarkerContent, MarkerTooltip } from '@/components/ui/map'
import { type RoutePoint, useRouteStore } from '@/stores/route-store'
import { ROUTE_LINE_COLOR } from '../lib/route-style'

type RoutePointMarkerProps = {
  label: string
  point: RoutePoint
  onMove: (point: RoutePoint) => void
}

function RoutePointMarker({ label, point, onMove }: RoutePointMarkerProps) {
  return (
    <MapMarker
      longitude={point.longitude}
      latitude={point.latitude}
      anchor="center"
      draggable
      onDragEnd={({ lng, lat }) =>
        onMove({
          longitude: lng,
          latitude: lat,
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        })
      }
    >
      <MarkerContent>
        <div
          className="flex size-7 cursor-grab items-center justify-center rounded-full text-xs font-semibold text-white shadow-md ring-2 ring-white active:cursor-grabbing"
          style={{ backgroundColor: ROUTE_LINE_COLOR }}
        >
          {label}
        </div>
      </MarkerContent>
      <MarkerTooltip>{point.address}</MarkerTooltip>
    </MapMarker>
  )
}

export function RouteMarkers() {
  const start = useRouteStore((s) => s.start)
  const end = useRouteStore((s) => s.end)
  const setStart = useRouteStore((s) => s.setStart)
  const setEnd = useRouteStore((s) => s.setEnd)

  return (
    <>
      {start && <RoutePointMarker label="A" point={start} onMove={setStart} />}
      {end && <RoutePointMarker label="B" point={end} onMove={setEnd} />}
    </>
  )
}
