import { MapPin, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import {
  MapMarker,
  MarkerContent,
  MarkerPopup,
  useMap,
} from '@/components/ui/map'
import { useLocationStore } from '@/stores/location-store'

export function ZoomToLocation() {
  const { map } = useMap()
  const location = useLocationStore((s) => s.location)
  const clearLocation = useLocationStore((s) => s.clearLocation)
  const prevLocationRef = useRef<typeof location>(null)

  useEffect(() => {
    if (!map || !location) return
    // Only fly when location actually changes
    if (
      prevLocationRef.current?.longitude === location.longitude &&
      prevLocationRef.current?.latitude === location.latitude
    ) {
      return
    }
    prevLocationRef.current = location

    map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 14,
      duration: 1500,
    })
  }, [map, location])

  if (!location) return null

  return (
    <MapMarker longitude={location.longitude} latitude={location.latitude}>
      <MarkerContent>
        <MapPin className="size-8 -translate-y-1/2 fill-red-500 text-red-700" />
      </MarkerContent>
      <MarkerPopup>
        <div className="flex flex-col gap-2 pr-4">
          <p className="text-sm font-medium">{location.address}</p>
          <p className="text-xs text-muted-foreground">
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </p>
          <button
            type="button"
            onClick={clearLocation}
            className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3" />
            Clear
          </button>
        </div>
      </MarkerPopup>
    </MapMarker>
  )
}
